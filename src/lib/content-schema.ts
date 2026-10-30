import { z } from "zod";
import { assetPathSchema, campaignAssetFields, imageReviewSchema, emptyImageReview, hexSchema } from "./image-schema";
import { documentPathSchema } from "./pdf-schema";

export const sourceKinds = ["terminology", "trial_days", "monthly_price", "offer", "tone", "evidence"] as const;
export const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/u).length : 0;
const optionalDate = z.iso.date().nullable();

export const sourceEntrySchema = z.strictObject({
  id: z.uuid(),
  kind: z.enum(sourceKinds),
  title: z.string().trim().min(1, "Give each source a title.").max(80),
  value: z.string().trim().min(1, "Enter the approved wording or value.").max(500),
  owner: z.string().trim().min(1, "Name the source owner.").max(100),
  source: z.string().trim().min(1, "Name the source supporting this rule or fact.").max(200),
  validFrom: optionalDate,
  validUntil: optionalDate,
  aliases: z.array(z.string().trim().min(1).max(80)).max(8),
  sourceDoc: documentPathSchema.nullable().optional(),
  quotedSpan: z.string().min(1).max(500).nullable().optional(),
}).superRefine((entry, ctx) => {
  if (entry.validFrom && entry.validUntil && entry.validFrom > entry.validUntil) {
    ctx.addIssue({ code: "custom", path: ["validUntil"], message: "The end date must follow the start date." });
  }
  if (["trial_days", "monthly_price"].includes(entry.kind) && (!/^\d{1,7}$/.test(entry.value) || Number(entry.value) < 1 || Number(entry.value) > 1_000_000)) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Enter a positive whole number for days or the monthly price in INR." });
  }
});
export type SourceEntry = z.infer<typeof sourceEntrySchema>;

export const sourceEntriesSchema = z.array(sourceEntrySchema).min(1, "Add at least one source.").max(30, "A workspace supports up to 30 sources.")
  .refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, "Each source needs a distinct ID.");
export const publishSourcesSchema = z.strictObject({ expectedVersion: z.number().int().nonnegative(), entries: sourceEntriesSchema,
  logoPath: assetPathSchema.nullable().default(null), palette: z.array(hexSchema).max(6).default([]) });

const documentFields = {
  documentPath: documentPathSchema.nullable().default(null),
  documentText: z.string().default(""),
  documentPages: z.number().int().nonnegative().default(0),
};

export const saveCampaignSchema = z.strictObject({
  campaignId: z.uuid().nullable(), expectedVersion: z.number().int().nonnegative(),
  title: z.string().trim().min(1, "Give the campaign a title.").max(120),
  purpose: z.string().trim().min(1, "Describe the campaign's purpose.").max(300),
  audience: z.string().trim().min(1, "Name the intended audience.").max(300),
  body: z.string().trim().min(1, "Enter campaign text.").max(120_000)
    .refine((body) => wordCount(body) <= 1500, "Keep campaign text within 1,500 words."),
  ...campaignAssetFields,
  ...documentFields,
  imageText: z.string().max(4000).default(""),
});
export type CampaignInput = z.infer<typeof saveCampaignSchema>;

export const campaignVersionSchema = z.object({
  id: z.uuid(), campaign_id: z.uuid(), version: z.number().int().positive(),
  title: z.string(), purpose: z.string(), audience: z.string(), body: z.string(), created_at: z.string(),
  image_path: assetPathSchema.nullable().default(null), alt_text: z.string().nullish().transform((v) => v ?? "").default(""),
  image_review: imageReviewSchema.nullish().transform((v) => v ?? emptyImageReview).default(emptyImageReview),
  foreground: hexSchema.nullish().transform((v) => v ?? "#000000").default("#000000"),
  background: hexSchema.nullish().transform((v) => v ?? "#ffffff").default("#ffffff"),
  document_path: documentPathSchema.nullable().default(null),
  document_text: z.string().nullish().transform((v) => v ?? "").default(""),
  document_pages: z.number().int().nonnegative().nullish().transform((v) => v ?? 0).default(0),
  image_text: z.string().nullish().transform((v) => v ?? "").default(""),
});
export const campaignSchema = z.object({
  id: z.uuid(), creator_id: z.uuid(), current_version: z.number().int().positive(),
  status: z.enum(["draft", "submitted", "changes_requested", "approved"]),
  campaign_versions: z.array(campaignVersionSchema),
}).refine((campaign) => campaign.campaign_versions.some((version) => version.version === campaign.current_version) &&
  campaign.campaign_versions.every((version) => version.campaign_id === campaign.id), "Saved campaign versions do not match.");
export type Campaign = z.infer<typeof campaignSchema>;
export const rulebookSchema = z.object({
  id: z.uuid(), version: z.number().int().positive(), entries: sourceEntriesSchema,
  published_at: z.string(), published_by: z.uuid(),
  logo_path: assetPathSchema.nullable().default(null), palette: z.array(hexSchema).default([]),
});
export const deskStateSchema = z.object({
  workspaceName: z.string().default("SampleCo"),
  campaignOffset: z.number().int().nonnegative().default(0), hasMoreCampaigns: z.boolean().default(false),
  rulebookVersion: z.number().int().nonnegative(),
  rulebooks: z.array(rulebookSchema), campaigns: z.array(campaignSchema),
}).refine((state) => state.rulebookVersion === (state.rulebooks[0]?.version || 0), "The source publication changed while loading. Reload the workspace.");
export type DeskState = z.infer<typeof deskStateSchema>;
