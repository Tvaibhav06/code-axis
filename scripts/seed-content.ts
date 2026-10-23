import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { demoManifestSchema, type DemoRole } from "../src/lib/demo-schema";
import { samplecoDraft, samplecoSources } from "../src/lib/sampleco";

loadEnvConfig(process.cwd());
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const manifest = demoManifestSchema.parse(JSON.parse(process.env.DEMO_POOL_ACCOUNTS_JSON || "null"));
  if (!url || !key || manifest.projectUrl !== url) throw new Error("configuration");
  for (let index = 0; index < manifest.slots.length; index += 1) {
    const slot = manifest.slots[index];
    async function signIn(role: DemoRole) {
      const account = slot.accounts[role];
      const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) } });
      const auth = await client.auth.signInWithPassword({ email: account.email, password: account.password });
      if (auth.error || auth.data.user?.id !== account.userId) throw new Error("sign-in");
      return client;
    }
    const manager = await signIn("manager");
    try {
      const workspace = await manager.from("workspaces").select("rulebook_version").eq("id", slot.workspaceId).single();
      if (workspace.error) throw new Error("workspace");
      if (workspace.data.rulebook_version === 0) {
        const source = await manager.rpc("publish_rulebook", { p_workspace: slot.workspaceId, p_expected_version: 0, p_entries: samplecoSources });
        if (source.error) throw new Error("publication");
      }
    } finally { await manager.auth.signOut({ scope: "local" }); }
    const creator = await signIn("creator");
    try {
      const existing = await creator.from("campaigns").select("id").eq("workspace_id", slot.workspaceId).limit(1);
      if (existing.error) throw new Error("campaign read");
      if (!existing.data?.length) {
        const saved = await creator.rpc("save_campaign", { p_workspace: slot.workspaceId, p_campaign: null, p_expected_version: 0,
          p_title: samplecoDraft.title, p_purpose: samplecoDraft.purpose, p_audience: samplecoDraft.audience, p_body: samplecoDraft.body });
        if (saved.error) throw new Error("campaign save");
      }
    } finally { await creator.auth.signOut({ scope: "local" }); }
    console.log(`SampleCo content ready in workspace ${index + 1}/${manifest.slots.length}. Existing publications and drafts were preserved.`);
  }
}

main().catch(() => {
  console.error("Content seed blocked or failed. Apply the Phase 2 migration and seed the demo identities first. No credentials or raw service errors were logged.");
  process.exitCode = 1;
});
