import { demoRoleSchema } from "@/lib/demo-schema";
import { DemoError, demoErrorResponse, endDemo, requireDemoContext, requireSameOrigin, startDemo, switchDemoRole } from "@/server/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ action: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if ((await context.params).action !== "session") return Response.json({ error: "Not found." }, { status: 404, headers: noStore });
  try {
    const { lease, role } = await requireDemoContext();
    return Response.json({ workspaceId: lease.workspace_id, role, expiresAt: lease.expires_at,
      aiAttemptsRemaining: lease.ai_attempt_limit - lease.ai_attempts }, { headers: noStore });
  } catch (error) { return demoErrorResponse(error); }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const { action } = await context.params;
    if (action === "start") await startDemo();
    else if (action === "switch-role") {
      if (!request.headers.get("content-type")?.startsWith("application/json")) throw new DemoError(400, "Choose a valid demo role.");
      const body = await request.json().catch(() => null);
      const parsed = demoRoleSchema.safeParse(body?.role);
      if (!parsed.success) throw new DemoError(400, "Choose creator, reviewer or manager.");
      await switchDemoRole(parsed.data);
    } else if (action === "end") await endDemo();
    else return Response.json({ error: "Not found." }, { status: 404, headers: noStore });
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) { return demoErrorResponse(error); }
}
