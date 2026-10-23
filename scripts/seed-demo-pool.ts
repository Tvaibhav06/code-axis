import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { demoManifestSchema, demoRoles, type DemoManifest } from "../src/lib/demo-schema";

loadEnvConfig(process.cwd());

function saveSetting(key: string, value: string) {
  // Secrets live only in .env.local, not a cache, generated JSON file or stdout.
  const path = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const line = `${key}=${value}`;
  const index = lines.findIndex((item) => item.startsWith(`${key}=`));
  if (index >= 0) lines[index] = line; else lines.push(line);
  writeFileSync(path, lines.join("\n"));
  process.env[key] = value;
}

const saveManifest = (manifest: DemoManifest) => saveSetting("DEMO_POOL_ACCOUNTS_JSON", JSON.stringify(manifest));

function newSlot(verificationOnly: boolean): DemoManifest["slots"][number] {
  const id = randomUUID();
  const account = (role: string) => ({ email: `brd-${id.replaceAll("-", "").slice(0, 16)}-${role}@example.test`,
    password: randomBytes(32).toString("base64url") });
  return { id, workspaceId: randomUUID(), verificationOnly,
    accounts: { creator: account("creator"), reviewer: account("reviewer"), manager: account("manager") } };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || new URL(url).protocol !== "https:") throw new Error("configuration");
  const size = Number(process.env.DEMO_POOL_SIZE || "24");
  const sessionLimit = Number(process.env.DEMO_AI_ATTEMPT_LIMIT || "5");
  const globalLimit = Number(process.env.GLOBAL_AI_ATTEMPT_LIMIT || "0");
  if (!Number.isInteger(size) || size < 1 || size > 60 || !Number.isInteger(globalLimit) || globalLimit < 0 ||
    !Number.isInteger(sessionLimit) || sessionLimit < 1 || sessionLimit > 15 ||
    (process.env.GEMINI_BILLING_TIER !== "paid" && sessionLimit > 5)) throw new Error("allowance");
  if (process.env.GEMINI_BILLING_TIER === "paid" && process.env.GEMINI_PAID_PROJECT_CONFIRMED !== "true") throw new Error("billing");
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }) },
  });
  // Check the migration before creating any Auth accounts. Never reset consumption.
  const configured = await admin.rpc("configure_demo_pool", { p_session_limit: sessionLimit, p_global_limit: globalLimit });
  if (configured.error) throw new Error("migration");

  let manifest: DemoManifest;
  if (process.env.DEMO_POOL_ACCOUNTS_JSON) {
    manifest = demoManifestSchema.parse(JSON.parse(process.env.DEMO_POOL_ACCOUNTS_JSON));
    const currentSize = manifest.slots.filter((slot) => !slot.verificationOnly).length;
    if (manifest.projectUrl !== url || currentSize > size ||
      manifest.slots.filter((slot) => slot.verificationOnly).length !== 2) throw new Error("manifest");
    if (currentSize < size) {
      manifest.slots.push(...Array.from({ length: size - currentSize }, () => newSlot(false)));
      saveManifest(manifest);
    }
  } else {
    manifest = { projectUrl: url, slots: Array.from({ length: size + 2 }, (_, index) => newSlot(index >= size)) };
    // Persist passwords before provisioning, so an interrupted run can resume safely.
    saveManifest(manifest);
  }

  for (let index = 0; index < manifest.slots.length; index += 1) {
    const slot = manifest.slots[index];
    for (const role of demoRoles) {
      const account = slot.accounts[role];
      if (account.userId) {
        const existing = await admin.auth.admin.getUserById(account.userId);
        if (existing.error || existing.data.user.email !== account.email || existing.data.user.app_metadata.brd_demo_slot !== slot.id) throw new Error("identity");
      } else {
        const created = await admin.auth.admin.createUser({ email: account.email, password: account.password,
          email_confirm: true, app_metadata: { brd_demo_slot: slot.id }, user_metadata: { display_name: `SampleCo ${role}` } });
        if (created.error || !created.data.user) {
          // Recover an account created just before an interrupted local manifest write.
          let found = false;
          for (let page = 1; page <= 20; page += 1) {
            const listed = await admin.auth.admin.listUsers({ page, perPage: 100 });
            if (listed.error) throw new Error("identity");
            const match = listed.data.users.find((user) => user.email === account.email && user.app_metadata.brd_demo_slot === slot.id);
            if (match) { account.userId = match.id; found = true; break; }
            if (listed.data.users.length < 100) break;
          }
          if (!found) throw new Error("identity");
        } else account.userId = created.data.user.id;
        saveManifest(manifest);
      }
    }
    const workspace = await admin.from("workspaces").upsert({ id: slot.workspaceId, name: "SampleCo" }, { onConflict: "id", ignoreDuplicates: true });
    if (workspace.error) throw new Error("workspace");
    const members = await admin.from("workspace_members").upsert(demoRoles.map((role) => ({
      workspace_id: slot.workspaceId, user_id: slot.accounts[role].userId!, role,
    })), { onConflict: "workspace_id,user_id" });
    if (members.error) throw new Error("membership");
    const registered = await admin.rpc("register_demo_slot", { p_slot: slot.id, p_workspace: slot.workspaceId, p_verification: slot.verificationOnly });
    if (registered.error) throw new Error("slot");
    console.log(`Prepared workspace ${index + 1}/${manifest.slots.length}${slot.verificationOnly ? " (verification only)" : ""}.`);
  }
  const capacity = await admin.rpc("demo_pool_capacity");
  if (capacity.error) throw new Error("capacity");
  const smoke = manifest.slots.find((slot) => slot.verificationOnly)!.accounts.creator;
  saveSetting("SUPABASE_SMOKE_EMAIL", smoke.email);
  saveSetting("SUPABASE_SMOKE_PASSWORD", smoke.password);
  console.log(JSON.stringify({ status: "seeded", capacity: capacity.data, verificationWorkspaces: 2,
    note: "The dedicated smoke-user settings now use a verification account. Copy the manifest and smoke settings from .env.local to Vercel privately. Keep demo entry disabled until live checks pass." }, null, 2));
}

main().catch(() => {
  console.error("Demo setup blocked or failed. Check the Phase 1 migration, service key, existing manifest and limits. No credentials were logged. Re-run with the same .env.local to resume; do not delete its manifest.");
  process.exitCode = 1;
});
