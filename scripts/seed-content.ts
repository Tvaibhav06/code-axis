import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { demoManifestSchema, type DemoRole } from "../src/lib/demo-schema";
import { samplecoDraft, samplecoSources } from "../src/lib/sampleco";

loadEnvConfig(process.cwd());
let stage = "configuration";
let serviceStatus: number | undefined;
let serviceCode: string | undefined;
function failed(error: { status?: number; code?: string } | null, message: string): never {
  serviceStatus = error?.status;
  serviceCode = error?.code && /^[A-Za-z0-9_]{1,60}$/.test(error.code) ? error.code : undefined;
  throw new Error(message);
}
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const manifest = demoManifestSchema.parse(JSON.parse(process.env.DEMO_POOL_ACCOUNTS_JSON || "null"));
  if (!url || !key || manifest.projectUrl !== url) throw new Error("configuration");
  const ready = new Set<string>();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Setup-only preflight avoids signing into every existing account on resume.
    // Runtime writes still use the real manager/creator and their RLS permissions.
    stage = "existing-content preflight";
    const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const ids = manifest.slots.map((slot) => slot.workspaceId);
    const [workspaces, campaigns] = await Promise.all([
      admin.from("workspaces").select("id,rulebook_version").in("id", ids),
      admin.from("campaigns").select("workspace_id").in("workspace_id", ids),
    ]);
    if (workspaces.error || campaigns.error) failed(workspaces.error || campaigns.error, "preflight");
    const populated = new Set(campaigns.data!.map((campaign) => campaign.workspace_id));
    for (const workspace of workspaces.data!) if (workspace.rulebook_version > 0 && populated.has(workspace.id)) ready.add(workspace.id);
  }
  for (let index = 0; index < manifest.slots.length; index += 1) {
    const slot = manifest.slots[index];
    if (ready.has(slot.workspaceId)) {
      console.log(`Workspace ${index + 1}/${manifest.slots.length} already has sources and a campaign; preserved without signing in.`);
      continue;
    }
    async function signIn(role: DemoRole) {
      stage = `workspace ${index + 1}/${manifest.slots.length}: ${role} sign-in`;
      const account = slot.accounts[role];
      const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) } });
      const auth = await client.auth.signInWithPassword({ email: account.email, password: account.password });
      if (auth.error || auth.data.user?.id !== account.userId) failed(auth.error, "sign-in");
      return client;
    }
    const manager = await signIn("manager");
    try {
      stage = `workspace ${index + 1}/${manifest.slots.length}: source publication`;
      const workspace = await manager.from("workspaces").select("rulebook_version").eq("id", slot.workspaceId).single();
      if (workspace.error) failed(workspace.error, "workspace");
      if (workspace.data.rulebook_version === 0) {
        const source = await manager.rpc("publish_rulebook", { p_workspace: slot.workspaceId, p_expected_version: 0, p_entries: samplecoSources });
        if (source.error) failed(source.error, "publication");
      }
    } finally { await manager.auth.signOut({ scope: "local" }); }
    const creator = await signIn("creator");
    try {
      stage = `workspace ${index + 1}/${manifest.slots.length}: campaign seed`;
      const existing = await creator.from("campaigns").select("id").eq("workspace_id", slot.workspaceId).limit(1);
      if (existing.error) failed(existing.error, "campaign read");
      if (!existing.data?.length) {
        const saved = await creator.rpc("save_campaign", { p_workspace: slot.workspaceId, p_campaign: null, p_expected_version: 0,
          p_title: samplecoDraft.title, p_purpose: samplecoDraft.purpose, p_audience: samplecoDraft.audience, p_body: samplecoDraft.body });
        if (saved.error) failed(saved.error, "campaign save");
      }
    } finally { await creator.auth.signOut({ scope: "local" }); }
    console.log(`SampleCo content ready in workspace ${index + 1}/${manifest.slots.length}. Existing publications and drafts were preserved.`);
  }
}

main().catch(() => {
  console.error(`Content seed stopped at ${stage}. Status=${serviceStatus ?? "unavailable"}; code=${serviceCode ?? "unavailable"}. Existing data and credentials are preserved. Resume with the same .env.local; no raw service error was logged.`);
  process.exitCode = 1;
});
