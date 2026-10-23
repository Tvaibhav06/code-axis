import { DemoError, demoErrorResponse, requireDemoContext, requireSameOrigin } from "@/server/demo";
import { getDeskState, publishSources, saveCampaign } from "@/server/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ action: string }> };
const headers = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, route: Context) {
  if ((await route.params).action !== "state") return Response.json({ error: "Not found." }, { status: 404, headers });
  try { return Response.json(await getDeskState(await requireDemoContext()), { headers }); }
  catch (error) { return demoErrorResponse(error); }
}

export async function POST(request: Request, route: Context) {
  try {
    requireSameOrigin(request);
    const context = await requireDemoContext();
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new DemoError(400, "Send valid form data.");
    const input = await request.json().catch(() => { throw new DemoError(400, "The form data could not be read."); });
    const { action } = await route.params;
    const result = action === "sources" ? await publishSources(context, input)
      : action === "campaigns" ? await saveCampaign(context, input) : null;
    if (!result) return Response.json({ error: "Not found." }, { status: 404, headers });
    return Response.json({ ok: true, result }, { headers });
  } catch (error) { return demoErrorResponse(error); }
}
