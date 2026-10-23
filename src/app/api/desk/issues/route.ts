import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDemoContext, demoErrorResponse, DemoError } from "@/server/demo";
import { issueCounts } from "@/lib/insights";
export async function GET() {
  try {
    const context = await requireDemoContext();
    const events = await context.client.from("review_events").select("id,finding_id,campaign_id,event_type,created_at,findings(rule_id)")
      .eq("workspace_id", context.lease.workspace_id).in("event_type", ["confirm", "dispute", "dismiss"]);
    const parsed = z.array(z.object({ id: z.uuid(), finding_id: z.uuid(), campaign_id: z.uuid(), event_type: z.enum(["confirm", "dispute", "dismiss"]), created_at: z.string(), findings: z.object({ rule_id: z.uuid() }) })).safeParse(events.data);
    if (events.error || !parsed.success) throw new DemoError(503, "Issue counts could not load. Retry after review setup is complete.");
    return NextResponse.json({ rows: issueCounts(parsed.data.map((e) => ({ id: e.id, findingId: e.finding_id, campaignId: e.campaign_id, ruleId: e.findings.rule_id, decision: e.event_type, createdAt: e.created_at }))) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return demoErrorResponse(error); }
}
