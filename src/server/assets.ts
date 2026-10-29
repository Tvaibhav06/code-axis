import "server-only";
import { z } from "zod";
import { assetPathSchema, MAX_IMAGE_BYTES } from "@/lib/image-schema";
import { validateImage } from "@/lib/image-validation";
import { recognizeImage, looksUnreadable, OcrError } from "@/lib/ocr";
import { DemoError, requireDemoContext } from "./demo";
import { createDemoAdminClient } from "./supabase";
import { emptyImageText, imageTextSchema, type ImageText } from "../lib/ocr-schema";

type Context = Awaited<ReturnType<typeof requireDemoContext>>;

function assertOwner(context: Context, path: string) {
  if (!["creator", "manager"].includes(context.role) || !assetPathSchema.safeParse(path).success || !path.startsWith(`${context.lease.workspace_id}/${context.userId}/`)) {
    throw new DemoError(403, "Upload is restricted to your own workspace and role.");
  }
}

export async function prepareUpload(context: Context, input: unknown) {
  const parsed = z.strictObject({ mime: z.enum(["image/png", "image/jpeg"]), bytes: z.number().int().positive().max(MAX_IMAGE_BYTES) }).safeParse(input);
  if (!parsed.success) throw new DemoError(400, "Choose a PNG/JPG up to 5 MB.");
  const path = `${context.lease.workspace_id}/${context.userId}/${crypto.randomUUID()}.${parsed.data.mime === "image/png" ? "png" : "jpg"}`;
  assertOwner(context, path);
  return { path, mime: parsed.data.mime };
}

export async function finaliseUpload(context: Context, input: unknown) {
  const parsed = z.strictObject({ path: assetPathSchema, mime: z.enum(["image/png", "image/jpeg"]) }).safeParse(input);
  if (!parsed.success) throw new DemoError(400, "Invalid image reference.");
  assertOwner(context, parsed.data.path);
  const image = await context.client.storage.from("brand-assets").download(parsed.data.path);
  if (image.error || !image.data) throw new DemoError(400, "The private image could not be read. Upload it again.");
  let metadata;
  try {
    if (image.data.size > MAX_IMAGE_BYTES || image.data.type !== parsed.data.mime) throw new Error("type/size");
    metadata = await validateImage(Buffer.from(await image.data.arrayBuffer()), parsed.data.mime);
  } catch { throw new DemoError(400, "Image validation failed. Use a complete still PNG/JPG up to 5 MB, 4096 pixels per side and 16 megapixels."); }
  const saved = await createDemoAdminClient().rpc("register_validated_asset", { p_workspace: context.lease.workspace_id, p_owner: context.userId,
    p_path: parsed.data.path, p_mime: metadata.mime, p_bytes: metadata.bytes, p_width: metadata.width, p_height: metadata.height, p_sha256: metadata.sha256 });
  if (saved.error) throw new DemoError(503, "The validated image reference could not be saved. No campaign change was made.");
  return { path: parsed.data.path, ...metadata };
}

export async function assetUrl(context: Context, path: string) {
  if (!assetPathSchema.safeParse(path).success) throw new DemoError(400, "Invalid image reference.");
  const asset = await context.client.from("validated_assets").select("path").eq("path", path).eq("workspace_id", context.lease.workspace_id).single();
  if (asset.error || !asset.data) throw new DemoError(403, "This validated image is not available in your workspace.");
  const signed = await context.client.storage.from("brand-assets").createSignedUrl(path, 300);
  if (signed.error) throw new DemoError(503, "Image preview unavailable. Reload the preview.");
  return { url: signed.data.signedUrl };
}

// Commitment 1: server-side OCR of an already-validated private image.
// Nothing is checked before the creator confirms the recognised text.
export async function recognizeImageText(context: Context, input: unknown) {
  const parsed = z.strictObject({ path: assetPathSchema }).safeParse(input);
  if (!parsed.success) throw new DemoError(400, "Invalid image reference.");
  assertOwner(context, parsed.data.path);
  const image = await context.client.storage.from("brand-assets").download(parsed.data.path);
  if (image.error || !image.data) throw new DemoError(400, "The private image could not be read. Upload it again.");
  if (image.data.size > MAX_IMAGE_BYTES) throw new DemoError(400, "Use a PNG/JPG image up to 5 MB.");
  let result: ImageText = emptyImageText;
  try {
    const recognized = await recognizeImage(Buffer.from(await image.data.arrayBuffer()));
    if (!recognized.text.trim() || looksUnreadable(recognized.text)) {
      result = { ...emptyImageText, manualReviewRequired: true };
    } else {
      result = { ...emptyImageText, recognized: recognized.text, confidence: recognized.confidence };
    }
  } catch (error) {
    if (error instanceof OcrError) {
      result = { ...emptyImageText, manualReviewRequired: true };
    } else {
      throw new DemoError(503, "Image recognition is temporarily unavailable. Manual review is required.");
    }
  }
  return { path: parsed.data.path, ...result };
}

export async function confirmImageText(context: Context, input: unknown) {
  const parsed = z.strictObject({
    path: assetPathSchema,
    confirmed: z.string().trim().min(1, "Confirm or correct the recognised text."),
    confirmedAt: z.iso.datetime().nullable().default(null),
  }).safeParse(input);
  if (!parsed.success) throw new DemoError(400, parsed.error.issues[0]?.message || "Check the image text.");
  assertOwner(context, parsed.data.path);
  // The confirmed text is a creator-supplied string; it is stored as-is and joined
  // to the campaign body for checking. The server does not re-run OCR on it.
  const text = imageTextSchema.parse({ recognized: "", confirmed: parsed.data.confirmed, confirmedAt: parsed.data.confirmedAt, confidence: 0, manualReviewRequired: false });
  return { path: parsed.data.path, ...text };
}