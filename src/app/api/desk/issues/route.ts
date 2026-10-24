import { NextResponse } from "next/server";
import { requireDemoContext, demoErrorResponse } from "@/server/demo";
import { getIssueCounts } from "@/server/insights";
export async function GET() {
  try {
    const context = await requireDemoContext();
    return NextResponse.json({ rows: await getIssueCounts(context) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return demoErrorResponse(error); }
}
