import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { demoLeaseSchema, demoManifestSchema, demoRoles, type DemoRole } from "@/lib/demo-schema";
import { createDemoAdminClient, createUserClient, publicSupabaseConfig } from "./supabase";

const leaseCookie = "brd_demo_lease";
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export class DemoError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function demoAccessEnabled() {
  return process.env.DEMO_ACCESS_ENABLED === "true";
}

function manifest() {
  const parsed = demoManifestSchema.parse(JSON.parse(process.env.DEMO_POOL_ACCOUNTS_JSON || "null"));
  if (parsed.projectUrl !== publicSupabaseConfig().url || parsed.slots.some((slot) => demoRoles.some((role) => !slot.accounts[role].userId))) {
    throw new DemoError(503, "Demo setup is incomplete. Please try again later.");
  }
  return parsed;
}

function requireEnabled() {
  if (!demoAccessEnabled()) throw new DemoError(503, "The interactive demo is still being prepared.");
}

async function readLease() {
  const token = (await cookies()).get(leaseCookie)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new DemoError(401, "Start a demo to continue.");
  const admin = createDemoAdminClient();
  const result = await admin.rpc("resolve_demo_lease", { p_token_hash: digest(token) });
  if (result.error) throw new DemoError(503, "Demo access is temporarily unavailable.");
  const lease = demoLeaseSchema.safeParse(result.data?.[0]);
  if (!lease.success) throw new DemoError(401, "This demo session has expired. Start a new demo.");
  const slot = manifest().slots.find((entry) => entry.id === lease.data.slot_id && entry.workspaceId === lease.data.workspace_id && !entry.verificationOnly);
  if (!slot) throw new DemoError(503, "Demo access is temporarily unavailable.");
  return { lease: lease.data, slot, tokenHash: digest(token) };
}

export async function requireDemoContext() {
  requireEnabled();
  const client = await createUserClient();
  const [context, { data, error }] = await Promise.all([readLease(), client.auth.getUser()]);
  if (error || !data.user) throw new DemoError(401, "Your sign-in expired. Use Start demo to reconnect.");
  const role = demoRoles.find((candidate) => context.slot.accounts[candidate].userId === data.user.id);
  if (!role) throw new DemoError(403, "This identity does not belong to the demo session.");
  const membership = await client.from("workspace_members").select("role")
    .eq("workspace_id", context.lease.workspace_id).eq("user_id", data.user.id).single();
  if (membership.error || membership.data?.role !== role) throw new DemoError(403, "Workspace access was denied.");
  return { ...context, client, userId: data.user.id, role };
}

async function signIn(slot: ReturnType<typeof manifest>["slots"][number], role: DemoRole) {
  const client = await createUserClient();
  const account = slot.accounts[role];
  const result = await client.auth.signInWithPassword({ email: account.email, password: account.password });
  if (result.error || result.data.user?.id !== account.userId) {
    throw new DemoError(503, "Sign-in is temporarily unavailable. Your workspace is reserved; retry to reconnect.");
  }
}

// A role switch is several sequential requests. Without a shared deadline a slow
// provider or a stalled network can outlast the browser's own timeout and leave the
// UI pinned to "Updating your sign-in…" with no way to recover.
function withDeadline<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new DemoError(503, message)), ms)),
  ]);
}

export async function startDemo() {
  requireEnabled();
  const pool = manifest();
  const store = await cookies();
  const existing = store.get(leaseCookie)?.value;
  if (existing && /^[A-Za-z0-9_-]{43}$/.test(existing)) {
    try {
      const context = await readLease();
      // Preserve the selected identity on refresh. Reconnect as creator only if Auth expired.
      try { await requireDemoContext(); } catch (error) {
        if (error instanceof DemoError && error.status === 401) await withDeadline(signIn(context.slot, "creator"), 15_000, "Reconnecting took too long. Refresh the page to retry.");
        else throw error;
      }
      return;
    } catch (error) {
      if (!(error instanceof DemoError) || error.status !== 401) throw error;
    }
  }
  const token = randomBytes(32).toString("base64url");
  const result = await withDeadline(createDemoAdminClient().rpc("claim_demo_slot", { p_token_hash: digest(token), p_verification: false }), 15_000, "Demo access took too long. Please retry.");
  if (result.error) throw new DemoError(503, "Demo access is temporarily unavailable.");
  if (!result.data?.length) throw new DemoError(503, "All demo workspaces have been used. Please try again after the team adds capacity.");
  const lease = demoLeaseSchema.parse(result.data[0]);
  const slot = pool.slots.find((item) => item.id === lease.slot_id && item.workspaceId === lease.workspace_id && !item.verificationOnly);
  if (!slot) throw new DemoError(503, "Demo setup is incomplete.");
  // Persist the reservation before Auth, so a failed login can reconnect without consuming another slot.
  store.set(leaseCookie, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", expires: new Date(lease.expires_at),
  });
  await withDeadline(signIn(slot, "creator"), 15_000, "Sign-in took too long. Refresh the page to retry.");
}

export async function switchDemoRole(role: DemoRole) {
  const context = await requireDemoContext();
  await withDeadline(signIn(context.slot, role), 15_000, "The role switch took too long. Refresh the page and try again.");
}

export async function endDemo() {
  const client = await createUserClient();
  const result = await client.auth.signOut({ scope: "local" });
  if (result.error) throw new DemoError(503, "Sign-out could not finish. Please retry.");
  (await cookies()).delete(leaseCookie);
  // The slot remains used; it is never reassigned to another visitor.
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    throw new DemoError(403, "Request origin was not accepted.");
  }
}

export function demoErrorResponse(error: unknown) {
  return Response.json({ error: error instanceof DemoError ? error.message : "Demo access is temporarily unavailable." }, {
    status: error instanceof DemoError ? error.status : 503,
    headers: { "Cache-Control": "private, no-store" },
  });
}
