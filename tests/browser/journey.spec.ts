import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
test("saved copy → check → revise → independent approval → export → invalidate", async ({ page, context }, info) => {
  const realAi = process.env.PHASE6_AI === "true";
  const includeImage = realAi || process.env.PHASE6_IMAGES === "true";
  info.annotations.push({ type: "mode", description: realAi ? "real-provider journey" : "AI-off manual recovery; not a live-AI pass" });
  let lastAi = Number(process.env.PHASE6_LAST_AI_AT_MS || 0);
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.getByRole("button", { name: "Start demo", exact: true }).click();
  await expect(page).toHaveURL(/\/desk/);
  await expect(page.getByLabel("Demo role", { exact: true })).toHaveValue("creator");
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
  const check = async () => {
    await expect(page.getByRole("button", { name: "Run checks", exact: true })).toBeVisible();
    await expect(page.getByLabel("Include a real AI check")).toBeEnabled();
    await page.getByLabel("Include a real AI check").setChecked(realAi);
    if (realAi) {
      await page.getByLabel(/I am using fictional data/).check();
      const remaining = 65_000 - (Date.now() - lastAi);
      if (remaining > 0) { console.log("Waiting for the planned free-tier call spacing."); await new Promise((resolve) => setTimeout(resolve, remaining)); }
      lastAi = Date.now();
    }
    const result = page.waitForResponse((r) => r.url().endsWith("/api/review/check") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Run checks", exact: true }).click();
    const response = await result; expect(response.ok()).toBe(true);
    const data = await response.json(); expect(data.result.status).toBe(realAi ? "complete" : "manual");
    await expect(page.getByRole("button", { name: "Run checks", exact: true })).toBeEnabled();
  };
  await check();
  await expect(page.getByText("Source conflict", { exact: true }).first()).toBeVisible();
  const clean = "Try SampleCo free for 14 days.";
  await page.getByLabel("English campaign text").fill(clean);
  if (includeImage) {
    const graphic = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="white"/><rect x="30" y="30" width="120" height="80" fill="#245b47"/><text x="48" y="85" font-size="44" fill="white">SC</text><text x="30" y="200" font-size="30" fill="black">Try SampleCo free for 14 days.</text></svg>')).png().toBuffer();
    const validated = page.waitForResponse((r) => r.url().endsWith("/api/assets/finalise"));
    await page.getByLabel("Optional campaign image").setInputFiles({ name: "sampleco-campaign.png", mimeType: "image/png", buffer: graphic });
    expect((await validated).ok()).toBe(true);
    await page.getByLabel("Alternative text (required for approval)").fill("SampleCo logo above an invitation to try SampleCo free for 14 days.");
    for (const label of ["Logo matches the approved asset", "Logo spacing follows the published guidance", "All image text is readable", "Colours follow the approved palette"]) await page.getByLabel(label, { exact: true }).check();
  }
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/desk/campaigns") && r.request().method() === "POST");
  await page.getByRole("button", { name: /^Save version/ }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page.getByText("No current check. Run checks again after changing copy or sources.")).toBeVisible();
  await check();
  await page.getByLabel("Comment or reason").fill("Saved copy and source checks are ready for independent review.");
  await page.getByRole("button", { name: "Submit saved version for review" }).click();
  await expect(page.getByText(/Version \d+ · submitted/)).toBeVisible();
  await page.getByLabel("Demo role", { exact: true }).selectOption("reviewer");
  await expect(page.getByLabel("Demo role", { exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Approve saved version", exact: true })).toBeVisible();
  if (!realAi) {
    await page.getByLabel("I checked all facts against current sources.").check();
    await page.getByLabel("I checked claims and their evidence.").check();
    await page.getByLabel("I checked tone and messaging manually.").check();
  }
  await page.getByLabel("I reviewed the saved copy, sources and any image checks.").check();
  await page.getByRole("button", { name: "Approve saved version", exact: true }).click();
  await expect(page.getByText("Approved for this saved version", { exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download approved HTML record" }).click();
  const download = await downloadEvent;
  const file = await download.path(); expect(file).toBeTruthy();
  const html = await readFile(file!, "utf8"); expect(html).toContain(clean); expect(html).not.toContain("<script");
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
  await expect(page.getByText("No current approval", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("approval-invalidated.png"), fullPage: true });
});
