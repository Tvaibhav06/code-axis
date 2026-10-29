import { z } from "zod";

// Commitment 1: text inside images. Bounds mirror the existing image limits.
export const MAX_IMAGE_TEXT_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_TEXT_CHARS = 4000;

export const imageTextSchema = z.object({
  recognized: z.string().max(MAX_IMAGE_TEXT_CHARS),
  confirmed: z.string().max(MAX_IMAGE_TEXT_CHARS),
  confirmedAt: z.string().nullable(),
  confidence: z.number().min(0).max(100),
  manualReviewRequired: z.boolean(),
});
export type ImageText = z.infer<typeof imageTextSchema>;

export const emptyImageText: ImageText = {
  recognized: "",
  confirmed: "",
  confirmedAt: null,
  confidence: 0,
  manualReviewRequired: false,
};

// A finding quote must appear in the confirmed image text to be checked.
export function quoteInImageText(quote: string, imageText: string): boolean {
  return imageText.includes(quote);
}