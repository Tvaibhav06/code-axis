import sharp from "sharp";
import { createHash } from "node:crypto";
import { MAX_IMAGE_BYTES } from "./image-schema";
// Server-only callers. Kept independent of Next for real decoder boundary tests.
export async function validateImage(bytes: Buffer, mime: string) {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("Use a PNG/JPG image up to 5 MB.");
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if ((!png && !jpg) || mime !== (png ? "image/png" : "image/jpeg")) throw new Error("The image bytes must match the PNG/JPG file type.");
  if (png) {
    for (let offset = 8; offset + 8 <= bytes.length;) {
      const chunk = bytes.toString("ascii", offset + 4, offset + 8);
      if (chunk === "acTL") throw new Error("Use a still image; animated PNG is not supported.");
      const next = offset + bytes.readUInt32BE(offset) + 12;
      if (next > bytes.length || chunk === "IEND") break;
      offset = next;
    }
  }
  const options = { failOn: "warning" as const, limitInputPixels: 16_000_000 };
  const metadata = await sharp(bytes, options).metadata();
  if (!metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096 || (metadata.pages || 1) !== 1 ||
    metadata.format !== (png ? "png" : "jpeg")) throw new Error("Use a still image up to 4096 pixels per side and 16 megapixels.");
  // Metadata alone does not establish that a truncated/corrupt image decodes.
  await sharp(bytes, options).raw().toBuffer();
  return { width: metadata.width, height: metadata.height, bytes: bytes.length, mime, sha256: createHash("sha256").update(bytes).digest("hex") };
}
