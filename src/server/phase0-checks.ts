import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type CheckResult = {
  check: string;
  status: "passed" | "failed" | "blocked";
  detail: string;
  durationMs?: number;
};

const blocked = (check: string, detail: string): CheckResult => ({ check, status: "blocked", detail });
const result = (check: string, passed: boolean, detail: string, start: number): CheckResult => ({
  check, status: passed ? "passed" : "failed", detail, durationMs: Date.now() - start,
});

// This module is only imported by Node scripts and the server-only protected route.
// Never log credentials, raw provider errors, responses or user content.
async function supabaseChecks(): Promise<CheckResult[]> {
  const names = ["supabase-auth", "database-roundtrip", "private-storage-roundtrip"];
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    SUPABASE_SMOKE_EMAIL: email, SUPABASE_SMOKE_PASSWORD: password } = process.env;
  if (!url || !key || !email || !password) {
    return names.map((name) => blocked(name, "Supabase URL, publishable key and dedicated smoke-user credentials are required."));
  }
  const config = z.object({ url: z.url(), key: z.string().min(1), email: z.email(), password: z.string().min(1) }).safeParse({ url, key, email, password });
  if (!config.success) return names.map((name) => blocked(name, "Supabase configuration is invalid; inspect the local settings file."));
  const host = new URL(url);
  if (host.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(host.hostname)) {
    return names.map((name) => blocked(name, "Remote Supabase connections require HTTPS."));
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) },
  });
  const checks: CheckResult[] = [];
  let start = Date.now();
  let userId: string;
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      const known = error?.code === "invalid_credentials"
        ? "The dedicated Supabase Auth user's email/password was rejected. These must be an Auth user in this project, not dashboard login credentials."
        : error?.code === "email_not_confirmed"
          ? "Confirm the dedicated smoke user's email in Supabase Auth before testing."
          : "Check the publishable key, Auth user and project connection.";
      return [result(names[0], false, `Authentication failed (HTTP ${error?.status || 0}). ${known}`, start),
        ...names.slice(1).map((name) => blocked(name, "Authentication must pass first."))];
    }
    userId = data.user.id;
    checks.push(result(names[0], true, "Authenticated as the dedicated smoke user, without an admin key.", start));
  } catch {
    return [result(names[0], false, "Authentication failed or timed out. Check project configuration and the test user.", start), ...names.slice(1).map((n) => blocked(n, "Authentication must pass first."))];
  }

  const id = randomUUID();
  const nonce = randomUUID();
  start = Date.now();
  let dbPassed = false;
  let rowInserted = false;
  try {
    const inserted = await client.from("phase0_smoke_checks").insert({ id, owner_id: userId, nonce });
    if (inserted.error) throw new Error("insert");
    rowInserted = true;
    const read = await client.from("phase0_smoke_checks").select("id,nonce").eq("id", id).single();
    dbPassed = !read.error && read.data?.nonce === nonce;
  } catch { dbPassed = false; }
  finally {
    if (rowInserted) {
      try {
        const removed = await client.from("phase0_smoke_checks").delete().eq("id", id).eq("owner_id", userId);
        if (removed.error) dbPassed = false;
      } catch { dbPassed = false; }
    }
  }
  checks.push(result(names[1], dbPassed, dbPassed ? "Authenticated insert/read/delete passed." : "Database round-trip or cleanup failed. Apply the Phase 0 migration and inspect RLS.", start));

  const bucket = client.storage.from("phase0-smoke");
  const path = `${userId}/${id}.png`;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=", "base64");
  start = Date.now();
  let storagePassed = false;
  let uploaded = false;
  try {
    const upload = await bucket.upload(path, png, { contentType: "image/png", upsert: false });
    if (upload.error) throw new Error("upload");
    uploaded = true;
    const download = await bucket.download(path);
    if (download.error || !download.data) throw new Error("download");
    const bytesMatch = png.equals(Buffer.from(await download.data.arrayBuffer()));
    const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
    const anonymousRead = await fetch(publicUrl, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    // A gateway/server failure is not evidence that a private access policy works.
    storagePassed = bytesMatch && [400, 401, 403, 404].includes(anonymousRead.status);
    await anonymousRead.body?.cancel();
  } catch { storagePassed = false; }
  finally {
    if (uploaded) {
      try { if ((await bucket.remove([path])).error) storagePassed = false; }
      catch { storagePassed = false; }
    }
  }
  checks.push(result(names[2], storagePassed, storagePassed ? "Private upload/download matched, anonymous public access was denied, and the fixture was removed." : "Private storage round-trip or cleanup failed. Check the migration, bucket and owner policies.", start));
  try { await client.auth.signOut({ scope: "local" }); } catch { /* Session is not persisted. */ }
  return checks;
}

const smokeOutput = z.object({
  brand: z.string(), approvedTrialDays: z.number().int(), claimedTrialDays: z.number().int(), hasConflict: z.boolean(),
});
const providerEnvelope = z.object({ candidates: z.array(z.object({
  finishReason: z.string().optional(),
  content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }).optional(),
})).optional() });

async function geminiCheck(model: string, label: string): Promise<CheckResult> {
  if (!process.env.GEMINI_API_KEY) return blocked(label, "GEMINI_API_KEY is required.");
  const tier = process.env.GEMINI_BILLING_TIER || "free";
  if (tier !== "free" && tier !== "paid") return blocked(label, "GEMINI_BILLING_TIER must be free or paid.");
  if (tier === "paid") {
    const cap = Number(process.env.GEMINI_MONTHLY_SPEND_CAP_USD);
    if (process.env.GEMINI_PAID_PROJECT_CONFIRMED !== "true" || !Number.isFinite(cap) || cap <= 0) {
      return blocked(label, "Confirm paid billing and configure the chosen project cap before using a paid project.");
    }
  }
  if (!/^gemini-[a-z0-9.-]+$/.test(model)) return blocked(label, "The configured model ID is invalid.");
  const start = Date.now();
  try {
    // Fixed fictional fixture only, including on free tier. This setting cannot
    // inspect or change provider billing. No user content is accepted by this check.
    // Single turn, bounded output, no tools or automatic retry.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Fictional smoke fixture: brand SampleCo. Approved trial: 14 days. Draft trial claim: 30 days. Return the brand, approvedTrialDays, claimedTrialDays and whether the trial claim hasConflict. This only tests structured extraction." }] }],
        generationConfig: { responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(smokeOutput), maxOutputTokens: 1024 },
      }),
    });
    if (!response.ok) return result(label, false, `${model}: provider returned HTTP ${response.status}; no response body or secret was logged.`, start);
    const envelope = providerEnvelope.parse(await response.json());
    const candidate = envelope.candidates?.[0];
    if (candidate?.finishReason !== "STOP") throw new Error("incomplete");
    const text = candidate.content?.parts.filter((part) => !part.thought).map((part) => part.text ?? "").join("") ?? "";
    const parsed = smokeOutput.parse(JSON.parse(text));
    const passed = parsed.brand === "SampleCo" && parsed.approvedTrialDays === 14 && parsed.claimedTrialDays === 30 && parsed.hasConflict;
    return result(label, passed, `${model}: ${passed ? "real structured response matched the fictional fixture" : "response did not match the fixture"}.`, start);
  } catch {
    return result(label, false, `${model}: request timed out, failed, or returned incomplete/invalid structured data.`, start);
  }
}

export const smokeScopes = ["all", "supabase", "primary", "fallback"] as const;
export async function runPhase0Checks(scope: typeof smokeScopes[number] = "all") {
  const checks: CheckResult[] = [];
  // An explicit narrow CLI scope avoids repeating successful provider calls.
  // The deployed diagnostic always uses all checks; there is no automatic retry.
  if (scope === "all" || scope === "supabase") checks.push(...await supabaseChecks());
  if (scope === "all" || scope === "primary") checks.push(await geminiCheck(process.env.GEMINI_MODEL || "gemini-3.8-flash", "gemini-primary"));
  if (scope === "all" || scope === "fallback") checks.push(await geminiCheck(process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash", "gemini-fallback"));
  return { scope, checkedAt: new Date().toISOString(), passed: checks.every((c) => c.status === "passed"), checks };
}
