import { z } from "zod";

// Commitment 2: private text-PDF review. Bounds are enforced by the server before
// any bytes are handed to the parser, so hostile or oversized input never reaches it.
export const MAX_PDF_BYTES = 2 * 1024 * 1024;
export const MAX_PDF_PAGES = 5;
export const MAX_PDF_WORDS = 1500;

export const pdfPageSchema = z.object({ num: z.number().int().positive(), text: z.string() });
export const pdfTextSchema = z.object({
  pages: z.array(pdfPageSchema).min(1).max(MAX_PDF_PAGES),
  wordCount: z.number().int().nonnegative(),
  total: z.number().int().positive(),
});
export type PdfText = z.infer<typeof pdfTextSchema>;

export const pdfIngestSchema = z.object({
  bytes: z.number().int().positive().max(MAX_PDF_BYTES),
  pages: z.number().int().positive().max(MAX_PDF_PAGES),
  words: z.number().int().nonnegative().max(MAX_PDF_WORDS),
  text: z.string(),
});
export type PdfIngest = z.infer<typeof pdfIngestSchema>;

export const documentPathSchema = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/, "Use a private PDF path.");

export const pdfIngestRequestSchema = z.strictObject({
  path: documentPathSchema,
  mime: z.literal("application/pdf"),
  bytes: z.number().int().positive().max(MAX_PDF_BYTES),
});

// Rejection reasons are surfaced to the user. Each maps to a distinct failure mode.
export const pdfRejection = {
  tooLarge: "Use a PDF up to 2 MB.",
  tooManyPages: "Use a PDF up to 5 pages.",
  tooManyWords: "Keep the extracted text within 1,500 words.",
  notPdf: "The file is not a PDF. Use a text PDF.",
  encrypted: "This PDF is password protected. Remove the password and try again.",
  scanned: "This looks like a scanned image with no selectable text. Add text or use an image review.",
  unreadable: "The PDF could not be read. Use a text PDF.",
} as const;