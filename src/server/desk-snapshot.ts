import "server-only";
import { z } from "zod";
import { deskSnapshotSchema } from "@/lib/desk-snapshot";
import { getDeskState } from "./content";
import { DemoError, requireDemoContext } from "./demo";
import { getIssueCounts } from "./insights";
import { getReviewState } from "./review";

async function readable<T>(read: Promise<T>, message: string) {
  try { return { value: await read, error: "" }; }
  catch (error) { return { value: null, error: error instanceof DemoError ? error.message : message }; }
}

// One request-scoped identity, one workspace snapshot and one shared review read.
// No cross-request cache: approval is recomputed on every reload and export.
export async function getDeskSnapshot(context: Awaited<ReturnType<typeof requireDemoContext>>, requested?: string, offset = 0) {
  if (requested && !z.uuid().safeParse(requested).success) throw new DemoError(400, "Choose a saved campaign.");
  if (!Number.isInteger(offset) || offset < 0 || offset > 1_000_000) throw new DemoError(400, "Choose a valid campaign page.");
  const [state, issues, requestedReview] = await Promise.all([
    getDeskState(context, { campaignId: requested, offset }),
    readable(getIssueCounts(context), "Issue counts are unavailable. Refresh to retry."),
    requested ? readable(getReviewState(context, requested), "Review state is unavailable. Load latest to retry.") : null,
  ]);
  if (requested && !state.campaigns.some((c) => c.id === requested)) throw new DemoError(404, "Campaign not found in this workspace.");
  const campaignId = requested || state.campaigns[0]?.id || null;
  const review = requestedReview || (campaignId ? await readable(getReviewState(context, campaignId), "Review state is unavailable. Load latest to retry.") : null);
  return deskSnapshotSchema.parse({ state, campaignId, review: review?.value || null, reviewError: review?.error || "",
    issueRows: issues.value || [], issueError: issues.error,
    aiAvailable: process.env.AI_CHECKS_ENABLED !== "false" && !!process.env.GEMINI_API_KEY && !!process.env.GEMINI_MODEL,
    fallbackAvailable: !!process.env.GEMINI_FALLBACK_MODEL && process.env.GEMINI_FALLBACK_MODEL !== process.env.GEMINI_MODEL });
}
