import { NextResponse } from "next/server";
import { z } from "zod";
import { DemoError, demoErrorResponse, requireDemoContext } from "@/server/demo";
import { getDeskState } from "@/server/content";
import { getReviewState } from "@/server/review";
import { approvalStateSchema } from "@/lib/review-schema";
import { handoffHtml } from "@/lib/handoff";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ campaign: string }> }) {
  try {
    const { campaign } = await params;
    if (!z.uuid().safeParse(campaign).success) throw new DemoError(400, "Choose a saved campaign.");
    const context = await requireDemoContext();
    const [review, state] = await Promise.all([getReviewState(context, campaign, true), getDeskState(context, { campaignId: campaign })]);
    if (!review.approval?.current) throw new DemoError(409, review.approval?.reason || "A current approval is required for export.");
    let html;
    try { html = handoffHtml(state, campaign, review, process.env.NEXT_PUBLIC_SITE_URL || ""); }
    catch { throw new DemoError(409, "The approved snapshot changed or site settings are incomplete. Reload before exporting."); }
    // Check again after assembling the record. A concurrent edit must not receive a current-approved handoff.
    const refreshed = await context.client.rpc("approval_state", { p_campaign: campaign });
    const latest = approvalStateSchema.safeParse(refreshed.data);
    if (refreshed.error || !latest.success || !latest.data.current || latest.data.approval?.id !== review.approval.approval?.id) throw new DemoError(409, "Approval changed while preparing this record. Reload and re-review.");
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="BrandReview_${campaign}.html"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" } });
  } catch (error) { return demoErrorResponse(error); }
}
