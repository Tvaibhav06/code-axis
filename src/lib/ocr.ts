import { createWorker } from "tesseract.js";
import path from "node:path";
import fs from "node:fs";
import { MAX_IMAGE_TEXT_CHARS } from "./ocr-schema";
import { MAX_IMAGE_BYTES } from "./image-schema";

// Server-only. The caller must have already validated the bytes against the
// existing PNG/JPG rules; this module owns recognition only.
export class OcrError extends Error {}

// Tesseract.js spawns a worker thread and loads a language model, so a single
// process must not hold more than one worker at a time. The pool is created
// lazily and terminated on shutdown; a failed recognition returns a manual-review
// signal rather than a fabricated result.
const pool: { worker: Awaited<ReturnType<typeof createWorker>> | null; busy: boolean } = { worker: null, busy: false };

export async function ensureWorker(): Promise<Awaited<ReturnType<typeof createWorker>>> {
  if (pool.worker) return pool.worker;
  const rootDir = path.resolve(process.cwd());
  const localTrainedData = path.join(rootDir, "eng.traineddata");
  const hasLocalData = fs.existsSync(localTrainedData);

  const options: Record<string, unknown> = { gzip: false };
  if (hasLocalData) {
    options.langPath = rootDir;
  }

  try {
    const start = Date.now();
    const worker = await createWorker("eng", 1, options);
    console.log(`[OCR] Worker initialized in ${Date.now() - start}ms (local=${hasLocalData})`);
    pool.worker = worker;
    return worker;
  } catch (err) {
    console.error("[OCR] Worker initialization failed:", err);
    throw new OcrError("Image recognition is temporarily unavailable. Manual review is required.");
  }
}

export async function terminateOcrWorker() {
  if (pool.worker) {
    await pool.worker.terminate();
    pool.worker = null;
  }
}

export async function recognizeImage(bytes: Buffer): Promise<{ text: string; confidence: number }> {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new OcrError("Use a PNG/JPG image up to 5 MB.");
  if (pool.busy) throw new OcrError("Image recognition is busy. Try again in a moment.");
  pool.busy = true;
  try {
    const worker = await ensureWorker();
    const startRec = Date.now();
    const { data } = await worker.recognize(bytes);
    console.log(`[OCR] Recognition completed in ${Date.now() - startRec}ms (confidence=${data.confidence}%)`);
    const text = data.text.replace(/\r\n?/g, "\n").trim();
    if (text.length > MAX_IMAGE_TEXT_CHARS) throw new OcrError("The recognised text is too long to review.");
    return { text, confidence: Math.round(data.confidence ?? 0) };
  } catch (error) {
    if (error instanceof OcrError) throw error;
    console.error("[OCR] Recognition error:", error);
    throw new OcrError("Image recognition failed. Manual review is required.");
  } finally {
    pool.busy = false;
  }
}

// A page with no or almost no selectable text is a scan or a photo, not readable
// copy. Empty text counts as unreadable: a blank page is not a usable claim.
export function looksUnreadable(text: string): boolean {
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  return words === 0 || (words <= 2 && text.trim().length <= 6);
}