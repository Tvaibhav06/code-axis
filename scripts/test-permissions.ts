import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { demoManifestSchema, type DemoRole } from "../src/lib/demo-schema";

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
  // Admin access is restricted to cleanup of this script's unique fixtures.
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
  } finally {
    if (uploaded) {
      const cleanup = await cleanupClient.storage.from("brand-assets").remove([path]);
      check("Private test image cleanup succeeds", !cleanup.error);
    }
    await Promise.all([creator, reviewer, manager, otherCreator].map((client) => client.auth.signOut({ scope: "local" })));
  }
  console.log(`${failures === 0 ? "PASS" : "FAIL"} Phase 1 permission checks (${failures} failed).`);
  console.log("Source editing, approval and AI-limit execution checks belong to their later planned phases; they are not claimed verified here.");
  process.exitCode = failures ? 1 : 0;
}

main().catch(() => {
  console.error("Permission checks blocked or could not finish. Apply migrations and seed the two verification workspaces first. No credentials or raw service errors were logged.");
  process.exitCode = 1;
});
