import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function publicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Service settings are incomplete.");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    throw new Error("Remote service requires HTTPS.");
  }
  return { url, key };
}

// A caller-supplied signal bounds a whole multi-step flow (a role switch touches
// several requests) instead of leaving each request its own independent ten seconds.
function boundSignal(signal?: AbortSignal) {
  const perRequest = AbortSignal.timeout(10_000);
  return signal ? AbortSignal.any([signal, perRequest]) : perRequest;
}

// Trusted allocation, check-result and validated-asset recording only, after lease/role checks.
// Ordinary product reads and human edits/approval use the user's RLS-bound client.
export function createDemoAdminClient(signal?: AbortSignal) {
  const { url } = publicSupabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Demo allocation is not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: boundSignal(signal) }) },
  });
}

export async function createUserClient(signal?: AbortSignal) {
  const { url, key } = publicSupabaseConfig();
  const store = await cookies();
  return createServerClient(url, key, {
    cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax" },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        // Server Components cannot write cookies; the auth proxy refreshes them.
        // Route handlers can and must persist refreshed/role-switched sessions.
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Read-only Server Component; proxy handles renewal. */ }
      },
    },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: boundSignal(signal) }) },
  });
}
