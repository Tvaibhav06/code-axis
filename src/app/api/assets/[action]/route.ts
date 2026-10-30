import { NextRequest, NextResponse } from "next/server";
import { requireDemoContext, requireSameOrigin, demoErrorResponse } from "@/server/demo";
import { prepareUpload, finaliseUpload, assetUrl } from "@/server/assets";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { createDemoAdminClient } from "@/server/supabase";
import { DemoError } from "@/server/demo";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const pdfPrepareSchema = z.strictObject({
  mime: z.literal("application/pdf"),
  bytes: z.number().int().positive().max(2 * 1024 * 1024),
});

const pdfFinaliseSchema = z.strictObject({
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/),
  mime: z.literal("application/pdf"),
});

function assertOwner(context: Awaited<ReturnType<typeof requireDemoContext>>, path: string) {
  if (!["creator", "manager"].includes(context.role) || !path.startsWith(`${context.lease.workspace_id}/${context.userId}/`)) {
    throw new DemoError(403, "Upload is restricted to your own workspace and role.");
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params;
    if (action === "view") {
      const context = await requireDemoContext();
      return NextResponse.json(await assetUrl(context, request.nextUrl.searchParams.get("path") || ""), { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ error: "Use POST for document actions." }, { status: 405, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return demoErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const reqId = randomUUID();
  try {
    requireSameOrigin(request);
    const context = await requireDemoContext();
    const { action } = await params;

    if (action === "upload") {
      const formData = await request.formData().catch(() => { throw new DemoError(400, "The form data could not be read."); });
      const file = formData.get("file");
      if (!file || !(file instanceof Blob)) throw new DemoError(400, "Choose a PNG/JPG up to 5 MB.");
      if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 5 * 1024 * 1024) {
        throw new DemoError(400, "Choose a PNG/JPG up to 5 MB.");
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const { validateImage } = await import("@/lib/image-validation");
      let metadata;
      try {
        metadata = await validateImage(buffer, file.type);
      } catch (err) {
        throw new DemoError(400, err instanceof Error ? err.message : "Image validation failed.");
      }
      const path = `${context.lease.workspace_id}/${context.userId}/${randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
      assertOwner(context, path);

      const admin = createDemoAdminClient();
      const uploaded = await admin.storage.from("brand-assets").upload(path, buffer, { contentType: file.type, upsert: false });
      if (uploaded.error) {
        console.error("Server storage upload error:", uploaded.error);
        throw new DemoError(503, "Storage upload failed. Please retry.");
      }

      const saved = await admin.rpc("register_validated_asset", {
        p_workspace: context.lease.workspace_id,
        p_owner: context.userId,
        p_path: path,
        p_mime: metadata.mime,
        p_bytes: metadata.bytes,
        p_width: metadata.width,
        p_height: metadata.height,
        p_sha256: metadata.sha256,
      });
      if (saved.error) throw new DemoError(503, "The validated image reference could not be saved.");

      return NextResponse.json({ ok: true, result: { path, ...metadata } }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "upload-pdf") {
      const formData = await request.formData().catch((err) => {
        console.error(`[upload-pdf] [req=${reqId}] FormData read failed:`, err);
        throw new DemoError(400, "The form data could not be read.");
      });
      const file = formData.get("file");
      if (!file || !(file instanceof Blob)) throw new DemoError(400, "Choose a PDF up to 2 MB.");
      if (file.type !== "application/pdf" || file.size > 2 * 1024 * 1024) {
        throw new DemoError(400, "Document validation failed. Use a text PDF up to 2 MB, 5 pages and 1,500 words.");
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      let extraction;
      try {
        const { extractPdfText } = await import("@/lib/pdf");
        extraction = await extractPdfText(buffer);
      } catch (error) {
        const pdfModule = await import("@/lib/pdf").catch(() => null);
        if (pdfModule?.PdfError && error instanceof pdfModule.PdfError) {
          throw new DemoError(400, error.message);
        }
        console.error(`[upload-pdf] [req=${reqId}] Extraction/import failed:`, error);
        throw new DemoError(400, "Document validation failed. Use a text PDF up to 2 MB, 5 pages and 1,500 words.");
      }
      const path = `${context.lease.workspace_id}/${context.userId}/${randomUUID()}.pdf`;
      assertOwner(context, path);

      const admin = createDemoAdminClient();
      const uploaded = await admin.storage.from("brand-documents").upload(path, buffer, { contentType: "application/pdf", upsert: false });
      if (uploaded.error) {
        console.error(`[upload-pdf] [req=${reqId}] Server storage document upload error:`, uploaded.error);
        throw new DemoError(503, "The document could not be uploaded to private storage.");
      }

      const fullText = extraction.pages.map((page) => page.text).join("\n");
      const sha256 = createHash("sha256").update(Buffer.from(fullText)).digest("hex");
      const saved = await admin.rpc("register_validated_document", {
        p_workspace: context.lease.workspace_id,
        p_owner: context.userId,
        p_path: path,
        p_mime: "application/pdf",
        p_bytes: file.size,
        p_pages: extraction.total,
        p_words: extraction.wordCount,
        p_sha256: sha256,
        p_page_map: extraction.pages,
        p_text: fullText,
      });
      if (saved.error) {
        console.error(`[upload-pdf] [req=${reqId}] register_validated_document error:`, saved.error);
        throw new DemoError(503, "The validated document reference could not be saved. No campaign change was made.");
      }
      return NextResponse.json({ ok: true, result: { path, ...extraction, sha256 } }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const input = await request.json().catch(() => { throw new DemoError(400, "The form data could not be read."); });

    if (action === "prepare-pdf") {
      const parsed = pdfPrepareSchema.safeParse(input);
      if (!parsed.success) throw new DemoError(400, "Choose a PDF up to 2 MB.");
      const path = `${context.lease.workspace_id}/${context.userId}/${randomUUID()}.pdf`;
      assertOwner(context, path);
      return NextResponse.json({ ok: true, result: { path, mime: "application/pdf" } }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "finalise-pdf") {
      const parsed = pdfFinaliseSchema.safeParse(input);
      if (!parsed.success) throw new DemoError(400, "Invalid document reference.");
      assertOwner(context, parsed.data.path);
      const doc = await context.client.storage.from("brand-documents").download(parsed.data.path);
      if (doc.error || !doc.data) throw new DemoError(400, "The private document could not be read. Upload it again.");
      let extraction;
      try {
        if (doc.data.size > 2 * 1024 * 1024 || doc.data.type !== "application/pdf") throw new Error("type/size");
        const { extractPdfText } = await import("@/lib/pdf");
        extraction = await extractPdfText(Buffer.from(await doc.data.arrayBuffer()));
      } catch {
        throw new DemoError(400, "Document validation failed. Use a text PDF up to 2 MB, 5 pages and 1,500 words.");
      }
      const fullText = extraction.pages.map((page) => page.text).join("\n");
      const sha256 = createHash("sha256").update(Buffer.from(fullText)).digest("hex");
      const admin = createDemoAdminClient();
      const saved = await admin.rpc("register_validated_document", {
        p_workspace: context.lease.workspace_id,
        p_owner: context.userId,
        p_path: parsed.data.path,
        p_mime: "application/pdf",
        p_bytes: doc.data.size,
        p_pages: extraction.total,
        p_words: extraction.wordCount,
        p_sha256: sha256,
        p_page_map: extraction.pages,
        p_text: fullText,
      });
      if (saved.error) {
        console.error("register_validated_document error:", saved.error);
        throw new DemoError(503, "The validated document reference could not be saved. No campaign change was made.");
      }
      return NextResponse.json({ ok: true, result: { path: parsed.data.path, ...extraction, sha256 } }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "prepare") {
      return NextResponse.json({ ok: true, result: await prepareUpload(context, input) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (action === "finalise") {
      return NextResponse.json({ ok: true, result: await finaliseUpload(context, input) }, { headers: { "Cache-Control": "private, no-store" } });
    }

    return NextResponse.json({ error: "Unknown asset action." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return demoErrorResponse(error, reqId);
  }
}