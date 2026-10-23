import "server-only";
import { z } from "zod";
import { checkRequestSchema, runSchema } from "@/lib/review-schema";
import { exactChecks, applyLiteralSuggestion } from "@/lib/checks";
import { DemoError, requireDemoContext } from "./demo";
import { getDeskState, saveCampaign } from "./content";
import { createDemoAdminClient } from "./supabase";
import { AiFailure, reviewWithGemini } from "./gemini";
type Context = Awaited<ReturnType<typeof requireDemoContext>>;

export async function getRuns(context: Context, campaignId: string) {
  if (!z.uuid().safeParse(campaignId).success) throw new DemoError(400, "Choose a saved campaign.");
  const { data, error } = await context.client.from("check_runs").select("*,findings(*)").eq("workspace_id", context.lease.workspace_id)
    .eq("campaign_id", campaignId).order("created_at", { ascending: false });
  const parsed = z.array(runSchema).safeParse(data);
  if (error || !parsed.success) throw new DemoError(503, "Review history could not load. Check that the review migration has been applied.");
  return parsed.data;
}

export async function checkCampaign(context: Context, input: unknown) {
  const parsed = checkRequestSchema.safeParse(input);
  if (!parsed.success) throw new DemoError(400, "Choose a saved version and check settings.");
  const request = parsed.data;
  if (context.role !== "creator") throw new DemoError(403, "Only the creator runs campaign checks.");
  const state = await getDeskState(context);
  const campaign = state.campaigns.find((c) => c.id === request.campaignId && c.creator_id === context.userId);
  if (!campaign) throw new DemoError(403, "Campaign access denied.");
  if (campaign.current_version !== request.version) throw new DemoError(409, "Load the latest version before running checks.");
  const version = campaign.campaign_versions.find((v) => v.version === campaign.current_version)!;
  const book = state.rulebooks[0];
  if (!book) throw new DemoError(400, "Publish approved sources first.");
  if (request.ai && !request.consent) throw new DemoError(400, "Confirm fictional-data consent or switch AI off.");
  const exact = exactChecks(version.body, book.entries);
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
      const ai = await reviewWithGemini(version.body, book.entries, model);
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
  const state = await getDeskState(context);
  const campaign = state.campaigns.find((c) => c.id === parsed.data.campaignId);
  if (!campaign || campaign.current_version !== parsed.data.version) throw new DemoError(409, "Load the latest campaign first.");
  const version = campaign.campaign_versions.find((v) => v.version === campaign.current_version)!;
  const runs = await getRuns(context, campaign.id);
  const run = runs.find((r) => r.content_version_id === version.id && r.rulebook_id === state.rulebooks[0]?.id);
  const finding = run?.findings.find((f) => f.id === parsed.data.findingId);
  if (!finding?.suggestion) throw new DemoError(409, "This suggestion is no longer current.");
  return saveCampaign(context, { campaignId: campaign.id, expectedVersion: campaign.current_version, title: version.title,
    purpose: version.purpose, audience: version.audience, body: applyLiteralSuggestion(version.body, finding.quote, finding.suggestion) });
}
