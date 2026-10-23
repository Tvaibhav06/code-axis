import { NextRequest, NextResponse } from "next/server";
import { requireDemoContext, requireSameOrigin, demoErrorResponse } from "@/server/demo";
import { getReviewState, checkCampaign, applySuggestion, humanAction, approve } from "@/server/review";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  try { return NextResponse.json(await getReviewState(await requireDemoContext(), request.nextUrl.searchParams.get("campaign") || ""), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return demoErrorResponse(error); }
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await requireDemoContext();
    const { action } = await params;
    const input = await request.json();
    const result = action === "check" ? await checkCampaign(context, input) : action === "apply" ? await applySuggestion(context, input)
      : action === "human" ? await humanAction(context, input) : action === "approve" ? await approve(context, input) : null;
    if (!result) return NextResponse.json({ error: "Unknown review action." }, { status: 404 });
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return demoErrorResponse(error); }
}
