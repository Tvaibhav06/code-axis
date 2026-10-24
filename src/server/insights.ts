import "server-only";
import { z } from "zod";
import { issueCounts } from "@/lib/insights";
import { DemoError, requireDemoContext } from "./demo";
import { readRecords } from "./read-records";

export async function getIssueCounts(context: Awaited<ReturnType<typeof requireDemoContext>>) {
  const events = await readRecords((from, to) => context.client.from("review_events").select("id,finding_id,campaign_id,event_type,created_at,findings(rule_id)")
    .eq("workspace_id", context.lease.workspace_id).in("event_type", ["confirm", "dispute", "dismiss"]).order("created_at").order("id").range(from, to), true);
  const parsed = z.array(z.object({ id: z.uuid(), finding_id: z.uuid(), campaign_id: z.uuid(), event_type: z.enum(["confirm", "dispute", "dismiss"]), created_at: z.string(), findings: z.object({ rule_id: z.uuid() }) })).safeParse(events.data);
  if (events.error || !parsed.success) throw new DemoError(503, "Issue counts could not load. Use Refresh counts to retry.");
  return issueCounts(parsed.data.map((e) => ({ id: e.id, findingId: e.finding_id, campaignId: e.campaign_id, ruleId: e.findings.rule_id, decision: e.event_type, createdAt: e.created_at })));
}
