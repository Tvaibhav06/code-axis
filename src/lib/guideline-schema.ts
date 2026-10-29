import { z } from "zod";

// Commitment 3: guideline import candidate schema
export const guidelineCandidateSchema = z.strictObject({
  kind: z.enum(["terminology", "trial_days", "monthly_price", "offer", "tone", "evidence"]),
  title: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(500),
  owner: z.string().trim().min(1).max(100),
  source: z.string().trim().min(1).max(200),
  validFrom: z.iso.date().nullable(),
  validUntil: z.iso.date().nullable(),
  aliases: z.array(z.string().trim().min(1).max(80)).max(8),
  quotedSpan: z.string().min(1).max(500), // exact substring from extracted document text
  sourcePage: z.number().int().positive().max(5),
});

export const guidelineImportSchema = z.strictObject({
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/),
  candidates: z.array(guidelineCandidateSchema).min(1).max(10),
});

export type GuidelineCandidate = z.infer<typeof guidelineCandidateSchema>;
export type GuidelineImport = z.infer<typeof guidelineImportSchema>;