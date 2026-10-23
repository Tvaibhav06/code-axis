import { z } from "zod";

export const categories = ["source_conflict", "evidence_missing", "style_suggestion"] as const;
export const categoryLabels = { source_conflict: "Source conflict", evidence_missing: "Evidence missing", style_suggestion: "Style suggestion" };
export const aiFindingSchema = z.strictObject({
  ruleId: z.string().min(1).max(60), category: z.enum(categories), quote: z.string().min(1).max(500),
  explanation: z.string().min(1).max(1000), suggestion: z.string().min(1).max(1500).nullable(),
});
export const aiOutputSchema = z.strictObject({ findings: z.array(aiFindingSchema).max(12) });
export const findingSchema = aiFindingSchema.extend({ id: z.uuid(), origin: z.enum(["exact", "ai"]), blocking: z.boolean() });
export type Finding = z.infer<typeof findingSchema>;
export const checkRequestSchema = z.strictObject({ campaignId: z.uuid(), version: z.number().int().positive(),
  ai: z.boolean(), consent: z.boolean(), model: z.enum(["primary", "fallback"]) });
export const storedFindingSchema = z.object({
  id: z.uuid(), run_id: z.uuid(), rule_id: z.uuid(), category: z.enum(categories), quote: z.string(), explanation: z.string(),
  suggestion: z.string().nullable(), origin: z.enum(["exact", "ai"]), blocking: z.boolean(),
});
export const runSchema = z.object({
  id: z.uuid(), campaign_id: z.uuid(), content_version_id: z.uuid(), rulebook_id: z.uuid(),
  status: z.enum(["complete", "failed", "manual"]), model: z.string().nullable(), error_code: z.string().nullable(),
  supported_source_ids: z.array(z.string()), created_at: z.string(), findings: z.array(storedFindingSchema),
});
export type CheckRun = z.infer<typeof runSchema>;
export const eventSchema = z.object({ id: z.uuid(), actor_id: z.uuid(), actor_role: z.string(), event_type: z.string(),
  note: z.string(), finding_id: z.uuid().nullable(), created_at: z.string(), content_version_id: z.uuid() });
export type ReviewEvent = z.infer<typeof eventSchema>;
export const approvalRecordSchema = z.object({ id: z.uuid(), reviewer_id: z.uuid(), approved_at: z.string(), content_version_id: z.uuid(),
  rulebook_id: z.uuid(), run_id: z.uuid(), review_mode: z.string() });
export const approvalStateSchema = z.object({ current: z.boolean(), reason: z.string(), checked_at: z.string(), approval: approvalRecordSchema.nullable() });
export type ApprovalState = z.infer<typeof approvalStateSchema>;
export const reviewViewSchema = z.object({ runs: z.array(runSchema), events: z.array(eventSchema), approval: approvalStateSchema.nullable(), approvals: z.array(approvalRecordSchema).default([]) });
export type ReviewView = z.infer<typeof reviewViewSchema>;
