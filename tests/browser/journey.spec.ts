import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { MAX_IMAGE_BYTES } from "../../src/lib/image-schema";
test("saved copy → check → revise → independent approval → export → invalidate", async ({ page, context }, info) => {
  const realAi = process.env.PHASE6_AI === "true";
  const singleAi = realAi && process.env.PHASE6_SINGLE_AI === "true";
  const includeImage = realAi || process.env.PHASE6_IMAGES === "true";
  const maximumImage = process.env.PHASE6_MAX_IMAGE === "true";
  const exhaustedAllowance = process.env.PHASE6_ALLOWANCE_EXHAUSTED === "true";
  if (exhaustedAllowance) expect(realAi, "Exhaustion probe requires manual journey mode to avoid provider calls.").toBe(false);
  info.annotations.push({ type: "mode", description: singleAi ? "initial exact check, then one real AI check on revised copy; manual recovery if provider fails" : realAi ? "two real-provider checks" : "AI-off manual recovery; not a live-AI pass" });
  const evidence: { startedAt: string; mode: string; checks: { ai: boolean; status: string; errorCode: string | null; model: string | null }[]; maximumImageBytes: number | null; workflowComplete: boolean; timings: Record<string, number> } = {
    startedAt: new Date().toISOString(), mode: singleAi ? "one-live-call" : realAi ? "two-live-calls" : "manual", checks: [], maximumImageBytes: null, workflowComplete: false, timings: {},
  };
  const saveEvidence = () => writeFile(info.outputPath("journey-evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
  let currentAiComplete = false;
  let lastAi = Number(process.env.PHASE6_LAST_AI_AT_MS || 0);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const reviewState = page.locator("[data-review-state]");
  const ready = () => expect(reviewState).toHaveAttribute("data-review-state", "loaded");
  const pending = new Set<import("@playwright/test").Request>();
  page.on("request", (request) => { if (new URL(request.url()).origin === new URL(page.url()).origin) pending.add(request); });
  page.on("requestfinished", (request) => pending.delete(request));
  page.on("requestfailed", (request) => pending.delete(request));
  async function settle() {
    let quiet = 0;
    for (let i = 0; i < 160; i++) {
      await page.waitForTimeout(250);
      quiet = pending.size === 0 ? quiet + 1 : 0;
      if (quiet === 3) return;
    }
    throw new Error("Browser requests did not settle in 40 seconds.");
  }
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.getByRole("button", { name: "Start demo", exact: true }).click();
  await expect(page).toHaveURL(/\/desk/);
  await expect(page.getByLabel("Demo role", { exact: true })).toHaveValue("creator");
  await ready();
  let duplicateHistoryReads = 0;
  const countHistory = (request: import("@playwright/test").Request) => {
    if (new URL(request.url()).pathname === "/api/review/history") duplicateHistoryReads += 1;
  };
  page.on("request", countHistory);
  const warmStartedAt = Date.now();
  await page.reload();
  await ready();
  await settle();
  evidence.timings.warmReloadStartedAt = warmStartedAt;
  evidence.timings.warmReloadMs = Date.now() - warmStartedAt;
  expect(duplicateHistoryReads, "SSR supplies one shared review; panels must not refetch it independently").toBe(0);
  page.off("request", countHistory);
  if (includeImage) {
    await page.getByLabel("Demo role", { exact: true }).selectOption("manager");
    await expect(page.getByLabel("Approved palette", { exact: false })).toBeVisible();
    const logo = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#245b47"/><text x="18" y="55" font-size="44" fill="white">SC</text></svg>')).png().toBuffer();
    const validated = page.waitForResponse((r) => r.url().endsWith("/api/assets/finalise"));
    await page.getByLabel("Approved brand logo", { exact: false }).setInputFiles({ name: "sampleco-logo.png", mimeType: "image/png", buffer: logo });
    expect((await validated).ok()).toBe(true);
    await page.getByLabel("Approved palette", { exact: false }).fill("#000000, #ffffff, #245b47");
    await page.getByRole("button", { name: /^Publish source version/ }).click();
    await expect(page.getByRole("heading", { name: /Brand sources/ })).toContainText("Version 2");
    await page.getByLabel("Demo role", { exact: true }).selectOption("creator");
    await expect(page.getByLabel("English campaign text")).toBeEditable();
  }
  const check = async (useAi: boolean, expectedStatus = useAi ? "complete" : "manual") => {
    await expect(page.getByRole("button", { name: "Run checks", exact: true })).toBeVisible();
    await ready();
    const aiControl = page.getByLabel("Include a real AI check");
    if (useAi || await aiControl.isEnabled()) await aiControl.setChecked(useAi);
    else await expect(aiControl).not.toBeChecked();
    if (useAi) {
      await page.getByLabel(/I am using fictional data/).check();
      const remaining = 65_000 - (Date.now() - lastAi);
      if (remaining > 0) { console.log("Waiting for the planned free-tier call spacing."); await new Promise((resolve) => setTimeout(resolve, remaining)); }
      lastAi = Date.now();
    }
    const result = page.waitForResponse((r) => r.url().endsWith("/api/review/check") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Run checks", exact: true }).click();
    const response = await result; expect(response.ok()).toBe(true);
    const data = await response.json();
    const state = await (await context.request.get("/api/desk/state")).json();
    const history = await (await context.request.get(`/api/review/history?campaign=${state.campaigns[0].id}`)).json();
    const run = history.runs.find((r: { id: string }) => r.id === data.result.runId);
    expect(run).toBeTruthy();
    evidence.checks.push({ ai: useAi, status: run.status, errorCode: run.error_code, model: run.model });
    currentAiComplete = useAi && run.status === "complete";
    await saveEvidence();
    console.log(`Saved ${useAi ? "real AI" : "exact/manual"} result: ${run.status}; error=${run.error_code || "none"}.`);
    if (!(singleAi && useAi)) expect(data.result.status).toBe(expectedStatus);
    await expect(page.getByRole("button", { name: "Run checks", exact: true })).toBeEnabled();
  };
  await check(realAi && !singleAi);
  await expect(page.getByText("Source conflict", { exact: true }).first()).toBeVisible();
  if (!realAi && !exhaustedAllowance) {
    await page.getByLabel("Comment or reason").fill("Please review the fictional trial conflict.");
    await page.getByRole("button", { name: "Submit saved version for review" }).click();
    await expect(page.getByText(/Version \d+ · submitted/)).toBeVisible();
    const switched = page.waitForResponse((r) => r.url().endsWith("/api/demo/switch-role"));
    await page.getByLabel("Demo role", { exact: true }).selectOption("reviewer");
    await (await switched).finished();
    await expect(page.getByLabel("Demo role", { exact: true })).toBeDisabled();
    await expect(page.locator("[data-demo-pending=true]")).toHaveAttribute("inert", "");
    await expect(page.getByLabel("Demo role", { exact: true })).toHaveValue("reviewer");
    await expect(page.getByLabel("Demo role", { exact: true })).toBeEnabled();
    await page.getByLabel("Comment or reason").fill("Confirmed against the published 14-day trial.");
    await page.getByRole("button", { name: "Confirm issue", exact: true }).first().click();
    await expect(page.getByLabel("Comment or reason")).toHaveValue("");
    await expect(page.getByRole("table", { name: "Review decisions across this workspace" })).toBeVisible();
    for (const label of ["I checked all facts against current sources.", "I checked claims and their evidence.", "I checked tone and messaging manually.", "I reviewed the saved copy, sources and any image checks."]) await page.getByLabel(label, { exact: true }).check();
    const blocked = page.waitForResponse((r) => r.url().endsWith("/api/review/approve"));
    await page.getByRole("button", { name: "Approve saved version", exact: true }).click();
    expect((await blocked).status()).toBe(400);
    await page.getByLabel("Comment or reason").fill("Manager, please confirm the current trial length.");
    await page.getByRole("button", { name: "Ask manager for clarification" }).click();
    await expect(page.getByLabel("Comment or reason")).toHaveValue("");
    await page.getByLabel("Demo role", { exact: true }).selectOption("manager");
    await expect(page.getByLabel("Demo role", { exact: true })).toHaveValue("manager");
    await expect(page.getByLabel("Demo role", { exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Campaigns", exact: true }).click();
    await page.getByLabel("Comment or reason").fill("Confirmed: the approved trial is 14 days. Update the copy.");
    await page.getByRole("button", { name: "Record manager clarification" }).click();
    await expect(page.getByLabel("Comment or reason")).toHaveValue("");
    await page.getByLabel("Demo role", { exact: true }).selectOption("creator");
    await expect(page.getByLabel("English campaign text")).toBeEditable();
  }
  if (exhaustedAllowance) {
    const before = await (await context.request.get("/api/demo/session")).json();
    expect(before.aiAttemptsRemaining).toBeGreaterThan(0);
    await check(true, "failed");
    expect(evidence.checks.at(-1)?.errorCode).toBe("session_or_global_allowance_unavailable");
    await expect(page.getByText(/The AI allowance is unavailable or exhausted/)).toBeVisible();
    await expect(page.getByText("Source conflict", { exact: true }).first()).toBeVisible();
    const after = await (await context.request.get("/api/demo/session")).json();
    expect(after.aiAttemptsRemaining).toBe(before.aiAttemptsRemaining);
    info.annotations.push({ type: "allowance", description: "Shared allowance rejected; session had unused attempts; exact results survived; manual journey continues." });
  }
  const clean = "Try SampleCo free for 14 days.";
  await page.getByLabel("English campaign text").fill(clean);
  if (includeImage) {
    const graphic = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="white"/><rect x="30" y="30" width="120" height="80" fill="#245b47"/><text x="48" y="85" font-size="44" fill="white">SC</text><text x="30" y="200" font-size="30" fill="black">Try SampleCo free for 14 days.</text></svg>')).png().toBuffer();
    // Boundary fixture: original decodable PNG followed by inert padding, as in the decoder unit test.
    const upload = maximumImage ? Buffer.concat([graphic, Buffer.alloc(MAX_IMAGE_BYTES - graphic.length)]) : graphic;
    if (maximumImage) {
      await page.getByLabel("Optional campaign image").setInputFiles({ name: "too-large.png", mimeType: "image/png", buffer: Buffer.concat([upload, Buffer.from([0])]) });
      await expect(page.getByRole("status").filter({ hasText: "Choose a PNG/JPG up to 5 MB." })).toBeVisible();
    }
    const validated = page.waitForResponse((r) => r.url().endsWith("/api/assets/finalise"));
    await page.getByLabel("Optional campaign image").setInputFiles({ name: "sampleco-campaign.png", mimeType: "image/png", buffer: upload });
    const finalised = await validated;
    expect(finalised.ok()).toBe(true);
    if (maximumImage) {
      expect((await finalised.json()).result.bytes).toBe(MAX_IMAGE_BYTES);
      evidence.maximumImageBytes = upload.length;
      await saveEvidence();
    }
    await page.getByLabel("Alternative text (required for approval)").fill("SampleCo logo above an invitation to try SampleCo free for 14 days.");
    for (const label of ["Logo matches the approved asset", "Logo spacing follows the published guidance", "All image text is readable", "Colours follow the approved palette"]) await page.getByLabel(label, { exact: true }).check();
  }
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/desk/campaigns") && r.request().method() === "POST");
  await page.getByRole("button", { name: /^Save version/ }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page.getByText("No current check. Run checks again after changing copy or sources.")).toBeVisible();
  await check(realAi);
  await page.getByLabel("Comment or reason").fill("Saved copy and source checks are ready for independent review.");
  await page.getByRole("button", { name: "Submit saved version for review" }).click();
  await expect(page.getByText(/Version \d+ · submitted/)).toBeVisible();
  await page.getByLabel("Demo role", { exact: true }).selectOption("reviewer");
  await expect(page.getByLabel("Demo role", { exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Approve saved version", exact: true })).toBeVisible();
  if (!currentAiComplete) {
    await page.getByLabel("I checked all facts against current sources.").check();
    await page.getByLabel("I checked claims and their evidence.").check();
    await page.getByLabel("I checked tone and messaging manually.").check();
  }
  await page.getByLabel("I reviewed the saved copy, sources and any image checks.").check();
  const approvalStartedAt = Date.now();
  await page.getByRole("button", { name: "Approve saved version", exact: true }).click();
  await expect(page.getByText("Approved for this saved version", { exact: true })).toBeVisible();
  await settle();
  evidence.timings.approveStartedAt = approvalStartedAt;
  evidence.timings.approveMs = Date.now() - approvalStartedAt;
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download approved HTML record" }).click();
  const download = await downloadEvent;
  const file = await download.path(); expect(file).toBeTruthy();
  const html = await readFile(file!, "utf8"); expect(html).toContain(clean); expect(html).not.toContain("<script");
  if (!realAi) {
    // Controlled local delay: verify honest loading and one in-flight refresh.
    let reloads = 0;
    await page.route("**/api/desk/snapshot?*", async (route) => {
      reloads += 1;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      await route.continue();
    });
    try {
      await page.getByRole("button", { name: "Load latest", exact: true }).click();
      await expect(reviewState).toHaveAttribute("data-review-state", "loading");
      await expect(page.getByRole("button", { name: "Load latest", exact: true })).toBeDisabled();
      await expect(page.getByText("No current approval", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Download approved HTML record" })).toHaveCount(0);
      await ready();
      expect(reloads).toBe(1);
      await expect(page.getByText("Approved for this saved version", { exact: true })).toBeVisible();
    } finally { await page.unroute("**/api/desk/snapshot?*"); }
    // Controlled local failure: failure must settle, hide stale approval, and recover.
    await page.route("**/api/desk/snapshot?*", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Controlled local refresh failure" }) }));
    try {
      await page.getByRole("button", { name: "Load latest", exact: true }).click();
      await expect(reviewState).toHaveAttribute("data-review-state", "error");
      await expect(page.getByText("Loading approval status…", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Download approved HTML record" })).toHaveCount(0);
    } finally { await page.unroute("**/api/desk/snapshot?*"); }
    await page.getByRole("button", { name: "Load latest", exact: true }).click();
    await ready();
    await expect(page.getByText("Approved for this saved version", { exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("review-mobile.png"), fullPage: true });
  await page.getByLabel("Demo role", { exact: true }).selectOption("creator");
  await expect(page.getByLabel("English campaign text")).toBeEditable();
  await page.getByLabel("English campaign text").fill(`${clean} Explore it today.`);
  await page.getByRole("button", { name: /^Save version/ }).click();
  await expect(page.getByText("No current approval", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download approved HTML record" })).toHaveCount(0);
  const state = await (await context.request.get("/api/desk/state")).json();
  const campaign = state.campaigns[0];
  expect((await context.request.get(`/api/export/${campaign.id}`)).status()).toBe(409);
  await page.reload();
  await expect(page.getByText("Loading saved checks…", { exact: true })).toHaveCount(0);
  await ready();
  await expect(page.getByText("Loading issue counts…", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Run checks", exact: true })).toBeEnabled();
  await expect(page.getByText("No current approval", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("approval-invalidated.png"), fullPage: true });
  if (!realAi) {
    // Re-approve the changed content, then independently invalidate via sources.
    await check(false);
    await page.getByLabel("Comment or reason").fill("Revised saved copy is ready for manual review.");
    await page.getByRole("button", { name: "Submit saved version for review" }).click();
    await expect(page.getByText(/Version \d+ · submitted/)).toBeVisible();
    await page.getByLabel("Demo role", { exact: true }).selectOption("reviewer");
    await expect(page.getByLabel("Demo role", { exact: true })).toHaveValue("reviewer");
    await expect(page.getByLabel("Demo role", { exact: true })).toBeEnabled();
    for (const label of ["I checked all facts against current sources.", "I checked claims and their evidence.", "I checked tone and messaging manually.", "I reviewed the saved copy, sources and any image checks."]) await page.getByLabel(label, { exact: true }).check();
    await page.getByRole("button", { name: "Approve saved version", exact: true }).click();
    await expect(page.getByText("Approved for this saved version", { exact: true })).toBeVisible();
    await page.getByLabel("Demo role", { exact: true }).selectOption("manager");
    await expect(page.getByLabel("Approved wording or value").nth(1)).toHaveValue("14");
    await page.getByLabel("Approved wording or value").nth(1).fill("21");
    const publication = page.waitForResponse((r) => r.url().endsWith("/api/desk/sources"));
    await page.getByRole("button", { name: /^Publish source version/ }).click();
    expect((await publication).ok()).toBe(true);
    await expect(page.getByRole("button", { name: /^Publish source version/ })).toBeEnabled();
    await page.getByLabel("Demo role", { exact: true }).selectOption("reviewer");
    await expect(page.getByLabel("Demo role", { exact: true })).toHaveValue("reviewer");
    await expect(page.getByLabel("Demo role", { exact: true })).toBeEnabled();
    await ready();
    await expect(page.getByText("No current approval", { exact: true })).toBeVisible();
    expect((await context.request.get(`/api/export/${campaign.id}`)).status()).toBe(409);
  }
  expect(pageErrors, "No unhandled browser exceptions").toEqual([]);
  evidence.workflowComplete = true;
  await saveEvidence();
  // A provider failure may demonstrate manual recovery, but must still fail the live-AI gate.
  if (realAi) expect(currentAiComplete, "The live provider must complete; manual recovery is separate evidence.").toBe(true);
});
