import { z } from "zod";
import { campaignVersionSchema, rulebookSchema } from "./content-schema";
import { approvalRecordSchema, eventSchema, runSchema } from "./review-schema";
export const archiveKinds = ["sources", "versions", "checks", "events", "approvals"] as const;
export const archiveQuerySchema = z.object({ kind: z.enum(archiveKinds), campaign: z.uuid().optional(),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0), limit: z.coerce.number().int().min(1).max(20).default(20),
}).refine((q) => q.kind === "sources" || !!q.campaign, "Choose a campaign for this history.");
const cursor = { nextOffset: z.number().int().nonnegative().nullable() };
export const archivePageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("sources"), rows: z.array(rulebookSchema), ...cursor }),
  z.object({ kind: z.literal("versions"), rows: z.array(campaignVersionSchema), ...cursor }),
  z.object({ kind: z.literal("checks"), rows: z.array(runSchema), ...cursor }),
  z.object({ kind: z.literal("events"), rows: z.array(eventSchema), ...cursor }),
  z.object({ kind: z.literal("approvals"), rows: z.array(approvalRecordSchema), ...cursor }),
]);
export type ArchiveKind = typeof archiveKinds[number];
export type ArchivePage = z.infer<typeof archivePageSchema>;
