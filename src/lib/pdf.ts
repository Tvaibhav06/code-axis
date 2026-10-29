import { PDFParse } from "pdf-parse";
import { MAX_PDF_BYTES, MAX_PDF_PAGES, MAX_PDF_WORDS, pdfRejection, type PdfText } from "./pdf-schema";

// Server-only by usage: route handlers feed it validated bytes from private storage.
// The caller must enforce the byte ceiling before a buffer reaches this module.
export class PdfError extends Error {
  constructor(public readonly code: keyof typeof pdfRejection) {
    super(pdfRejection[code]);
  }
}

export const pdfWordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/u).length : 0);

export async function extractPdfText(bytes: Buffer): Promise<PdfText> {
  if (!bytes.length || bytes.length > MAX_PDF_BYTES) throw new PdfError("tooLarge");
  // %PDF- header: reject anything that is not a PDF before the parser sees it.
  if (bytes.subarray(0, 4).toString("latin1") !== "%PDF") throw new PdfError("notPdf");
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(bytes), verbosity: 0 });
    const info = await parser.getInfo({ parsePageInfo: true });
    const total = info.total;
    if (!Number.isInteger(total) || total < 1) throw new PdfError("unreadable");
    // The page ceiling is enforced here, before any page text is parsed.
    if (total > MAX_PDF_PAGES) throw new PdfError("tooManyPages");
    const result = await parser.getText({ lineEnforce: true, pageJoiner: "" });
    // The parser decrypts nothing without a password: a locked file surfaces as
    // a password/invalid-document error, or as empty text on every page.
    if (result.pages.length !== total) throw new PdfError("unreadable");
    const pages = result.pages.map((page) => ({ num: page.num, text: page.text.replace(/\r\n?/g, "\n") }));
    const words = pdfWordCount(pages.map((page) => page.text).join("\n"));
    if (!words) throw new PdfError("scanned");
    if (words > MAX_PDF_WORDS) throw new PdfError("tooManyWords");
    return { pages, wordCount: words, total };
  } catch (error) {
    if (error instanceof PdfError) throw error;
    const message = error instanceof Error ? `${error.name} ${error.message}` : "";
    if (/password/i.test(message)) throw new PdfError("encrypted");
    throw new PdfError("unreadable");
  } finally {
    // Release the document and its worker-held copy of the bytes.
    try { await parser?.destroy(); } catch { /* Best-effort cleanup only. */ }
  }
}
