import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { demoManifestSchema, type DemoRole } from "../src/lib/demo-schema";
import { samplecoDraft, samplecoSources } from "../src/lib/sampleco";
import { reviewPermissionChecks } from "./permission-review";

loadEnvConfig(process.cwd());
let failures = 0;
function check(name: string, passed: boolean) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  if (!passed) failures += 1;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const parsed = demoManifestSchema.safeParse(JSON.parse(process.env.DEMO_POOL_ACCOUNTS_JSON || "null"));
  if (!url || !key || !adminKey || !parsed.success || parsed.data.projectUrl !== url) throw new Error("configuration");
  // Admin access is limited to unique fixtures, trusted manual-run fixtures and cleanup.
  const cleanupClient = createClient(url, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const slots = parsed.data.slots.filter((slot) => slot.verificationOnly);
  if (slots.length !== 2) throw new Error("verification identities");
  const makeClient = () => createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) },
  });
  async function signIn(index: number, role: DemoRole) {
    const account = slots[index].accounts[role];
    const client = makeClient();
    const auth = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (auth.error || auth.data.user?.id !== account.userId) throw new Error("verification sign-in");
    return client;
  }
  const creator = await signIn(0, "creator");
  const reviewer = await signIn(0, "reviewer");
  const manager = await signIn(0, "manager");
  const otherCreator = await signIn(1, "creator");
  const anonymous = makeClient();
  const workspaceId = slots[0].workspaceId;
  const ownerId = slots[0].accounts.creator.userId!;
  const path = `${workspaceId}/${ownerId}/${randomUUID()}.png`;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=", "base64");
  let uploaded = false;
  try {
    const own = await creator.from("workspaces").select("id");
    check("Creator reads exactly its own workspace", !own.error && own.data?.length === 1 && own.data[0].id === workspaceId);
    const cross = await creator.from("workspaces").select("id").eq("id", slots[1].workspaceId);
    check("Cross-workspace rows are hidden", !cross.error && cross.data?.length === 0);
    const anon = await anonymous.from("workspaces").select("id");
    check("Anonymous workspace access is denied", anon.error?.code === "42501");
    for (const [role, client] of [["creator", creator], ["reviewer", reviewer], ["manager", manager]] as const) {
      const membership = await client.rpc("workspace_role", { p_workspace: workspaceId });
      check(`${role} has its actual database role`, !membership.error && membership.data === role);
    }
    const members = await creator.from("workspace_members").select("user_id,role");
    check("Three distinct role identities are visible", !members.error && members.data?.length === 3 && new Set(members.data.map((row) => row.user_id)).size === 3);
    // Same-value mutation detects overly broad grants without changing the role.
    const edit = await creator.from("workspace_members").update({ role: "creator" }).eq("user_id", ownerId);
    check("Creator cannot edit memberships", edit.error?.code === "42501");
    for (const [name, client] of [["anonymous", anonymous], ["authenticated", creator]] as const) {
      const allocation = await client.rpc("claim_demo_slot", { p_token_hash: "invalid", p_verification: false });
      check(`${name} cannot call privileged allocation RPC`, allocation.error?.code === "42501");
    }
    const upload = await creator.storage.from("brand-assets").upload(path, png, { contentType: "image/png" });
    uploaded = !upload.error;
    check("Creator uploads into its own private workspace", uploaded);
    if (!uploaded) throw new Error("fixture upload");
    for (const [name, client] of [["creator", creator], ["reviewer", reviewer], ["manager", manager]] as const) {
      const read = await client.storage.from("brand-assets").download(path);
      check(`${name} reads the stored image in the same workspace`, !read.error && !!read.data && png.equals(Buffer.from(await read.data.arrayBuffer())));
    }
    const privateRead = await otherCreator.storage.from("brand-assets").download(path);
    check("Other workspace cannot read the known private object", !!privateRead.error && ["400", "403", "404"].includes(String(privateRead.error.statusCode)));
    const publicUrl = creator.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
    const publicRead = await fetch(publicUrl, { signal: AbortSignal.timeout(10_000) });
    check("Anonymous public image URL is denied", [400, 401, 403, 404].includes(publicRead.status));
    await publicRead.body?.cancel();
    const reviewerPath = `${workspaceId}/${slots[0].accounts.reviewer.userId}/${randomUUID()}.png`;
    const reviewerWrite = await reviewer.storage.from("brand-assets").upload(reviewerPath, png, { contentType: "image/png" });
    check("Reviewer cannot upload assets", !!reviewerWrite.error && ["400", "403"].includes(String(reviewerWrite.error.statusCode)));
    if (!reviewerWrite.error) await cleanupClient.storage.from("brand-assets").remove([reviewerPath]);
    await reviewer.storage.from("brand-assets").remove([path]);
    const retained = await creator.storage.from("brand-assets").download(path);
    check("Reviewer cannot delete the creator's image", !retained.error && !!retained.data);
    await creator.storage.from("brand-assets").remove([path]);
    const immutable = await creator.storage.from("brand-assets").download(path);
    check("Stored images cannot be deleted behind a content version", !immutable.error && !!immutable.data);
    if (!process.argv.includes("--foundation-only")) {
      const workspace = await manager.from("workspaces").select("rulebook_version").eq("id", workspaceId).single();
      if (workspace.error) throw new Error("source setup");
      const expected = workspace.data.rulebook_version;
      const deniedPublish = await creator.rpc("publish_rulebook", { p_workspace: workspaceId, p_expected_version: expected, p_entries: samplecoSources });
      check("Creator cannot publish approved sources", deniedPublish.error?.code === "42501");
      const published = await manager.rpc("publish_rulebook", { p_workspace: workspaceId, p_expected_version: expected, p_entries: samplecoSources });
      check("Manager publishes a new source snapshot", !published.error && published.data?.[0]?.version === expected + 1);
      if (published.error || !published.data?.[0]?.id) throw new Error("source publication");
      const firstBookId = published.data[0].id;
      const staleSource = await manager.rpc("publish_rulebook", { p_workspace: workspaceId, p_expected_version: expected, p_entries: samplecoSources });
      check("Stale source publication is rejected", staleSource.error?.code === "40001");
      const thirty = [...samplecoSources, ...Array.from({ length: 24 }, () => ({ ...samplecoSources[4], id: randomUUID() }))];
      const fullBook = await manager.rpc("publish_rulebook", { p_workspace: workspaceId, p_expected_version: expected + 1, p_entries: thirty });
      check("Database accepts 30 source entries", !fullBook.error && fullBook.data?.[0]?.version === expected + 2);
      const overBook = await manager.rpc("publish_rulebook", { p_workspace: workspaceId, p_expected_version: expected + 2, p_entries: [...thirty, { ...samplecoSources[4], id: randomUUID() }] });
      check("Database rejects 31 source entries", overBook.error?.code === "22023");
      const oldBook = await creator.from("rulebooks").select("entries,version").eq("id", firstBookId).single();
      check("Previous source snapshot remains unchanged and readable", !oldBook.error && oldBook.data?.version === expected + 1 && isDeepStrictEqual(oldBook.data.entries, samplecoSources));
      const bookMutation = await manager.from("rulebooks").update({ entries: samplecoSources }).eq("id", firstBookId);
      check("Published source rows cannot be edited directly", bookMutation.error?.code === "42501");
      const args = { p_workspace: workspaceId, p_campaign: null, p_expected_version: 0, p_title: samplecoDraft.title,
        p_purpose: samplecoDraft.purpose, p_audience: samplecoDraft.audience, p_body: samplecoDraft.body };
      const deniedDraft = await reviewer.rpc("save_campaign", args);
      check("Reviewer cannot create a creator's draft", deniedDraft.error?.code === "42501");
      const created = await creator.rpc("save_campaign", args);
      check("Creator saves campaign version 1", !created.error && created.data?.[0]?.version === 1);
      const campaignId = created.data?.[0]?.campaign_id;
      if (created.error || !campaignId) throw new Error("campaign save");
      const revised = await creator.rpc("save_campaign", { ...args, p_campaign: campaignId, p_expected_version: 1, p_body: "Try SampleCo free for 14 days." });
      check("Creator saves numbered version 2", !revised.error && revised.data?.[0]?.version === 2);
      const history = await creator.from("campaign_versions").select("version,body").eq("campaign_id", campaignId).order("version");
      check("Reload preserves both immutable content versions", !history.error && history.data?.length === 2 && history.data[0].body === samplecoDraft.body && history.data[1].body === "Try SampleCo free for 14 days.");
      const staleDraft = await creator.rpc("save_campaign", { ...args, p_campaign: campaignId, p_expected_version: 1 });
      check("Stale campaign saves are rejected", staleDraft.error?.code === "40001");
      const foreignDraft = await otherCreator.rpc("save_campaign", { ...args, p_campaign: campaignId, p_expected_version: 2 });
      check("Another workspace cannot revise the campaign", foreignDraft.error?.code === "42501");
      const tooLong = await creator.rpc("save_campaign", { ...args, p_campaign: campaignId, p_expected_version: 2, p_body: Array(1501).fill("sample").join(" ") });
      check("Database rejects 1,501 words", tooLong.error?.code === "22023");
      const boundary = await creator.rpc("save_campaign", { ...args, p_campaign: campaignId, p_expected_version: 2, p_body: Array(1500).fill("sample").join(" ") });
      check("Database accepts 1,500 words", !boundary.error && boundary.data?.[0]?.version === 3);
      if (!process.argv.includes("--through-phase2")) await reviewPermissionChecks({ creator, reviewer, manager, otherCreator,
        admin: cleanupClient, workspaceId, ownerId, campaignId, bookId: fullBook.data[0].id, bookVersion: expected + 2, check });
    }
  } finally {
    if (uploaded) {
      const cleanup = await cleanupClient.storage.from("brand-assets").remove([path]);
      check("Private test image cleanup succeeds", !cleanup.error);
    }
    await Promise.all([creator, reviewer, manager, otherCreator].map((client) => client.auth.signOut({ scope: "local" })));
  }
  console.log(`${failures === 0 ? "PASS" : "FAIL"} ${process.argv.includes("--foundation-only") ? "Phase 1" : "Phase 1/2"} permission checks (${failures} failed).`);
  console.log("Manual permission fixtures are not AI accuracy or pilot evidence. AI quota and the browser journey require separate live verification.");
  process.exitCode = failures ? 1 : 0;
}

main().catch(() => {
  console.error("Permission checks blocked or could not finish. Apply migrations and seed the two verification workspaces first. No credentials or raw service errors were logged.");
  process.exitCode = 1;
});
