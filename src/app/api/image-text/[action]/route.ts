import { NextRequest, NextResponse } from "next/server";
import { DemoError, requireDemoContext, requireSameOrigin, demoErrorResponse } from "@/server/demo";
import { recognizeImageText, confirmImageText } from "@/server/assets";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    requireSameOrigin(request);
    const context = await requireDemoContext();
    const { action } = await params;
    const input = await request.json().catch(() => { throw new DemoError(400, "The form data could not be read."); });

    if (action === "recognize") {
      const result = await recognizeImageText(context, input);
      return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (action === "confirm") {
      const result = await confirmImageText(context, input);
      return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ error: "Unknown image-text action." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return demoErrorResponse(error);
  }
}