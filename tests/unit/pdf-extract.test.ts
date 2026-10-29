import { describe, it, expect } from "vitest";
import { buildPdf } from "../../scripts/make-test-pdf";
import { extractPdfText, pdfWordCount } from "../../src/lib/pdf";
import { MAX_PDF_BYTES, MAX_PDF_PAGES, MAX_PDF_WORDS, pdfRejection } from "../../src/lib/pdf-schema";

const threePages = [
  "Approved trial duration: 14 days.",
  "Approved monthly price: INR 499 per month.",
  "Use the brand name SampleCo on all materials.",
];

describe("PDF text extraction (Round 3 commitment 2)", () => {
  it("returns every page with its own page number and no lost or duplicated text", async () => {
    const result = await extractPdfText(Buffer.from(buildPdf(threePages)));
    expect(result.total).toBe(3);
    expect(result.pages.map((page) => page.num)).toEqual([1, 2, 3]);
    // Each fixture sentence appears exactly once, on its own page.
    for (const [index, sentence] of threePages.entries()) {
      expect(result.pages[index].text.trim()).toBe(sentence);
      expect(result.pages.filter((page) => page.text.includes(sentence))).toHaveLength(1);
    }
    expect(result.wordCount).toBe(pdfWordCount(threePages.join("\n")));
  });

  it("keeps a page-3 claim on page 3 so findings can cite the right page", async () => {
    const result = await extractPdfText(Buffer.from(buildPdf(threePages)));
    expect(result.pages.find((page) => page.text.includes("SampleCo"))?.num).toBe(3);
  });

  it("tolerates a page that carries no selectable text", async () => {
    const result = await extractPdfText(Buffer.from(buildPdf(["Readable opening line.", ""])));
    expect(result.total).toBe(2);
    expect(result.pages[1].text.trim()).toBe("");
    expect(result.wordCount).toBe(3);
  });

  it("rejects a document with no selectable text at all as a scan", async () => {
    await expect(extractPdfText(Buffer.from(buildPdf(["", "", ""])))).rejects.toThrow(pdfRejection.scanned);
  });

  it("rejects a password-protected PDF", async () => {
    await expect(extractPdfText(Buffer.from(buildPdf(threePages, { userPassword: "fixture-secret" })))).rejects.toThrow(pdfRejection.encrypted);
  });

  it("rejects a document with more than five pages before parsing page text", async () => {
    const over = Array.from({ length: MAX_PDF_PAGES + 1 }, (_, index) => `Line ${index + 1} of an over-long document.`);
    await expect(extractPdfText(Buffer.from(buildPdf(over)))).rejects.toThrow(pdfRejection.tooManyPages);
  });

  it("rejects extraction past the 1,500-word ceiling", async () => {
    const words = Array.from({ length: MAX_PDF_WORDS + 5 }, (_, index) => `word${index}`);
    // Ten words per line and the page ceiling for pages: pdf.js drops text drawn
    // outside the page box, so over-long single pages would silently lose words.
    const toLines = (slice: string[]): string[] => {
      const buckets: string[][] = [];
      slice.forEach((word, index) => { const line = Math.floor(index / 10); (buckets[line] ||= []).push(word); });
      return buckets.map((line) => line.join(" "));
    };
    const perPage = Math.ceil(words.length / MAX_PDF_PAGES);
    const pages = Array.from({ length: MAX_PDF_PAGES }, (_, index) => toLines(words.slice(index * perPage, (index + 1) * perPage)));
    await expect(extractPdfText(Buffer.from(buildPdf(pages)))).rejects.toThrow(pdfRejection.tooManyWords);
  });

  it("rejects bytes that are not a PDF, an empty buffer and an oversized buffer", async () => {
    await expect(extractPdfText(Buffer.from("this is not a PDF"))).rejects.toThrow(pdfRejection.notPdf);
    await expect(extractPdfText(Buffer.alloc(0))).rejects.toThrow(pdfRejection.tooLarge);
    await expect(extractPdfText(Buffer.alloc(MAX_PDF_BYTES + 1, 0x41))).rejects.toThrow(pdfRejection.tooLarge);
  });

  it("rejects a truncated PDF instead of reporting a clean result", async () => {
    const bytes = Buffer.from(buildPdf(threePages));
    await expect(extractPdfText(bytes.subarray(0, Math.floor(bytes.length / 2)))).rejects.toThrow();
  });

  it("rejects a PDF whose header is correct but whose body is garbage", async () => {
    await expect(extractPdfText(Buffer.from("%PDF-1.4\nthis body is not a valid document\n%%EOF\n"))).rejects.toThrow();
  });

  it("accepts a five-page document at the page ceiling", async () => {
    const five = Array.from({ length: MAX_PDF_PAGES }, (_, index) => `Page ${index + 1} approved wording.`);
    const result = await extractPdfText(Buffer.from(buildPdf(five)));
    expect(result.total).toBe(MAX_PDF_PAGES);
    expect(result.pages.at(-1)?.text).toContain("Page 5");
  });
});
