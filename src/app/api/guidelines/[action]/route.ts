import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DemoError, requireDemoContext, requireSameOrigin, demoErrorResponse } from "@/server/demo";
import { importGuidelines, extractGuidelineCandidates } from "@/server/guidelines";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await requireDemoContext();
    const { action } = await params;
    const input = await request.json().catch(() => { throw new DemoError(400, "The form data could not be read."); });

    if (action === "extract-guidelines") {
      const parsed = z.strictObject({ path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/) }).safeParse(input);
      if (!parsed.success) throw new DemoError(400, "Invalid document reference.");
      const candidates = await extractGuidelineCandidates(context, parsed.data.path);
      return NextResponse.json({ ok: true, result: { candidates } }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "import-guidelines") {
      const result = await importGuidelines(context, input);
      return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "private, no-store" } });
    }

    return NextResponse.json({ error: "Unknown guidelines action." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return demoErrorResponse(error);
  }
}