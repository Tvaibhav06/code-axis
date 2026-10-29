import { NextRequest, NextResponse } from "next/server";
import { requireDemoContext, requireSameOrigin, demoErrorResponse } from "@/server/demo";
import { prepareUpload, finaliseUpload } from "@/server/assets";
import { extractPdfText } from "@/lib/pdf";
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

export async function GET() {
  return NextResponse.json({ error: "Use POST for document actions." }, { status: 405, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await requireDemoContext();
    const { action } = await params;
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
        sha256,
        p_page_map: extraction.pages,
        p_text: fullText,
      });
      if (saved.error) throw new DemoError(503, "The validated document reference could not be saved. No campaign change was made.");
      return NextResponse.json({ ok: true, result: { path: parsed.data.path, ...extraction, sha256 } }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "prepare") {
      return NextResponse.json({ ok: true, result: prepareUpload(context, input) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (action === "finalise") {
      return NextResponse.json({ ok: true, result: await finaliseUpload(context, input) }, { headers: { "Cache-Control": "private, no-store" } });
    }

    return NextResponse.json({ error: "Unknown asset action." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return demoErrorResponse(error);
  }
}