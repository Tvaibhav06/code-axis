import { z } from "zod";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const assetPathSchema = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg)$/);
export const hexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour, such as #152238.");
export const imageReviewSchema = z.strictObject({ logo: z.boolean(), spacing: z.boolean(), readability: z.boolean(), palette: z.boolean() });
export const emptyImageReview = { logo: false, spacing: false, readability: false, palette: false };
export const campaignAssetFields = {
  imagePath: assetPathSchema.nullable().default(null), altText: z.string().trim().max(500).default(""),
  imageReview: imageReviewSchema.default(emptyImageReview), foreground: hexSchema.default("#000000"), background: hexSchema.default("#ffffff"),
};
export function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    hexSchema.parse(hex);
    const rgb = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
      .map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
