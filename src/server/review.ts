import "server-only";
import { z } from "zod";
import { checkRequestSchema, runSchema, reviewViewSchema } from "@/lib/review-schema";
import { exactChecks, applyLiteralSuggestion } from "@/lib/checks";
import { DemoError, requireDemoContext } from "./demo";
import { getDeskState, saveCampaign } from "./content";
import { createDemoAdminClient } from "./supabase";
import { AiFailure, reviewWithGemini } from "./gemini";
import { isVersionConflict } from "@/lib/conflicts";
import { readRecords } from "./read-records";
type Context = Awaited<ReturnType<typeof requireDemoContext>>;

export async function getReviewState(context: Context, campaignId: string, fullHistory = false) {
  if (!z.uuid().safeParse(campaignId).success) throw new DemoError(400, "Choose a saved campaign.");
  const [runs, events, approval, approvals] = await Promise.all([
    getRuns(context, campaignId, fullHistory),
    readRecords((from, to) => context.client.from("review_events").select("*").eq("workspace_id", context.lease.workspace_id).eq("campaign_id", campaignId)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to), fullHistory, 30),
    context.client.rpc("approval_state", { p_campaign: campaignId }),
    readRecords((from, to) => context.client.from("approvals").select("*").eq("workspace_id", context.lease.workspace_id).eq("campaign_id", campaignId)
      .order("approved_at", { ascending: false }).order("id", { ascending: false }).range(from, to), fullHistory, 10),
  ]);
  const parsed = reviewViewSchema.safeParse({ runs, events: events.data?.slice().reverse(), approval: approval.data, approvals: approvals.data });
  if (events.error || approval.error || approvals.error || !parsed.success) throw new DemoError(503, "Review/approval history is unavailable. Check the Phase 4 migration and reload.");
  return parsed.data;
}

const reviewActionSchema = z.strictObject({ campaignId: z.uuid(), version: z.number().int().positive(),
  action: z.enum(["comment", "submit", "confirm", "dispute", "dismiss", "request_changes", "clarification_request", "clarification_answer"]),
  note: z.string().trim().min(1).max(1500), findingId: z.uuid().nullable().default(null) });
export async function humanAction(context: Context, input: unknown) {
  const parsed = reviewActionSchema.safeParse(input);
  if (!parsed.success) throw new DemoError(400, "Choose an action and enter a note of up to 1,500 characters.");
  const p = parsed.data;
  const result = await context.client.rpc("review_action", { p_campaign: p.campaignId, p_expected_version: p.version, p_action: p.action, p_note: p.note, p_finding: p.findingId });
  if (result.error) reviewError(result.error.code);
  return result.data;
}
function reviewError(code?: string): never {
  if (code === "42501") throw new DemoError(403, "This action requires the authorised role and an independent reviewer.");
  if (isVersionConflict(code)) throw new DemoError(409, "The review, copy or sources changed. Load latest before retrying.");
  if (code === "22023") throw new DemoError(400, "Approval needs a submitted current version, resolved blocking findings, current supporting sources and all required review checks.");
  throw new DemoError(503, "The review action could not be confirmed. Load latest before retrying.");
}
export async function approve(context: Context, input: unknown) {
  const parsed = z.strictObject({ campaignId: z.uuid(), version: z.number().int().positive(), rulebookId: z.uuid(), runId: z.uuid(),
    checklist: z.strictObject({ finalReview: z.boolean(), facts: z.boolean(), claims: z.boolean(), tone: z.boolean() }) }).safeParse(input);
  if (!parsed.success) throw new DemoError(400, "Complete the reviewer checklist.");
  const p = parsed.data;
  const result = await context.client.rpc("approve_campaign", { p_campaign: p.campaignId, p_expected_version: p.version, p_rulebook: p.rulebookId, p_run: p.runId, p_checklist: p.checklist });
  if (result.error) reviewError(result.error.code);
  return result.data;
}

export async function getRuns(context: Context, campaignId: string, fullHistory = false) {
  if (!z.uuid().safeParse(campaignId).success) throw new DemoError(400, "Choose a saved campaign.");
  const { data, error } = await readRecords((from, to) => context.client.from("check_runs").select("*,findings(*)").eq("workspace_id", context.lease.workspace_id)
    .eq("campaign_id", campaignId).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to), fullHistory, 10);
  const parsed = z.array(runSchema).safeParse(data);
  if (error || !parsed.success) throw new DemoError(503, "Review history could not load. Check that the review migration has been applied.");
  return parsed.data;
}

export async function checkCampaign(context: Context, input: unknown) {
  const parsed = checkRequestSchema.safeParse(input);
  if (!parsed.success) throw new DemoError(400, "Choose a saved version and check settings.");
  const request = parsed.data;
  if (context.role !== "creator") throw new DemoError(403, "Only the creator runs campaign checks.");
  const state = await getDeskState(context, { campaignId: request.campaignId });
  const campaign = state.campaigns.find((c) => c.id === request.campaignId && c.creator_id === context.userId);
  if (!campaign) throw new DemoError(403, "Campaign access denied.");
  if (campaign.current_version !== request.version) throw new DemoError(409, "Load the latest version before running checks.");
  const version = campaign.campaign_versions.find((v) => v.version === campaign.current_version)!;
  const book = state.rulebooks[0];
  if (!book) throw new DemoError(400, "Publish approved sources first.");
  if (request.ai && !request.consent) throw new DemoError(400, "Confirm fictional-data consent or switch AI off.");
  // Commitment 1 & 2: confirmed image text and document text are joined to the copy before checking.
  // A finding quote must appear in the combined approved text to be recorded.
  const checkedBody = [version.body, version.image_text, version.document_text].filter(Boolean).join("\n");
  const exact = exactChecks(checkedBody, book.entries);
  if (exact.findings.length > 138) throw new DemoError(400, "This copy produces too many exact issues for one review. Correct the repeated terminology/fact conflicts or split the campaign before re-checking.");
  let findings = exact.findings;
  let status = "manual";
  let model: string | null = null;
  let errorCode: string | null = null;
  if (request.ai) {
    model = (request.model === "primary" ? process.env.GEMINI_MODEL : process.env.GEMINI_FALLBACK_MODEL) || null;
    try {
      if (!model || !process.env.GEMINI_API_KEY || process.env.AI_CHECKS_ENABLED === "false") throw new AiFailure("ai_not_configured");
      const allowance = await createDemoAdminClient().rpc("reserve_demo_ai_attempt", { p_token_hash: context.tokenHash });
      if (allowance.error) throw new AiFailure("session_or_global_allowance_unavailable");
      const ai = await reviewWithGemini(checkedBody, book.entries, model);
      findings = [...findings, ...ai.filter((f) => !findings.some((e) => e.ruleId === f.ruleId && e.quote === f.quote && e.category === f.category))];
      status = "complete";
    } catch (error) { status = "failed"; errorCode = error instanceof AiFailure ? error.message : "provider_unavailable"; }
  }
  const supported = [...new Set([...exact.supportedSourceIds, ...findings.map((f) => f.ruleId)])];
  const saved = await createDemoAdminClient().rpc("record_check_run", { p_workspace: context.lease.workspace_id, p_actor: context.userId,
    p_campaign: campaign.id, p_version: version.id, p_rulebook: book.id, p_status: status, p_model: model, p_error: errorCode,
    p_supported: supported, p_findings: findings });
  if (saved.error) throw new DemoError(503, "The check result could not be saved. Load review history before retrying; a provider attempt may have been used.");
  return { runId: saved.data, status };
}

export async function applySuggestion(context: Context, input: unknown) {
  const parsed = z.strictObject({ campaignId: z.uuid(), version: z.number().int().positive(), findingId: z.uuid() }).safeParse(input);
  if (!parsed.success) throw new DemoError(400, "Choose a finding on the current version.");
  const state = await getDeskState(context, { campaignId: parsed.data.campaignId });
  const campaign = state.campaigns.find((c) => c.id === parsed.data.campaignId);
  if (!campaign || campaign.current_version !== parsed.data.version) throw new DemoError(409, "Load the latest campaign first.");
  const version = campaign.campaign_versions.find((v) => v.version === campaign.current_version)!;
  const runs = await getRuns(context, campaign.id);
  const run = runs.find((r) => r.content_version_id === version.id && r.rulebook_id === state.rulebooks[0]?.id);
  const finding = run?.findings.find((f) => f.id === parsed.data.findingId);
  if (!finding?.suggestion) throw new DemoError(409, "This suggestion is no longer current.");
  return saveCampaign(context, { campaignId: campaign.id, expectedVersion: campaign.current_version, title: version.title,
    purpose: version.purpose, audience: version.audience, body: applyLiteralSuggestion(version.body, finding.quote, finding.suggestion),
    imagePath: version.image_path, altText: version.alt_text, imageReview: version.image_review, foreground: version.foreground, background: version.background,
    documentPath: version.document_path, documentText: version.document_text, documentPages: version.document_pages,
    imageText: version.image_text });
}
