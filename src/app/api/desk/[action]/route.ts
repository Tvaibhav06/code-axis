import { DemoError, demoErrorResponse, requireDemoContext, requireSameOrigin } from "@/server/demo";
import { getDeskState, publishSources, saveCampaign } from "@/server/content";
import { getDeskSnapshot } from "@/server/desk-snapshot";
import { getArchive } from "@/server/archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ action: string }> };
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request, route: Context) {
  const { action } = await route.params;
  if (!["state", "snapshot", "archive"].includes(action)) return Response.json({ error: "Not found." }, { status: 404, headers });
  try {
    const context = await requireDemoContext();
    const params = new URL(request.url).searchParams;
    return Response.json(action === "archive" ? await getArchive(context, params)
      : action === "snapshot" ? await getDeskSnapshot(context, params.get("campaign") || undefined, Number(params.get("offset") || 0)) : await getDeskState(context), { headers });
  }
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
