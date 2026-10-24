import { z } from "zod";
import { deskStateSchema } from "./content-schema";
import { reviewViewSchema } from "./review-schema";

export const issueRowsSchema = z.array(z.object({ ruleId: z.uuid(), confirmed: z.number().int().nonnegative(), disputed: z.number().int().nonnegative() }));
export const deskSnapshotSchema = z.object({
  state: deskStateSchema, campaignId: z.uuid().nullable(),
  review: reviewViewSchema.nullable(), reviewError: z.string(),
  issueRows: issueRowsSchema, issueError: z.string(), aiAvailable: z.boolean(), fallbackAvailable: z.boolean().default(false),
});
export type DeskSnapshot = z.infer<typeof deskSnapshotSchema>;
