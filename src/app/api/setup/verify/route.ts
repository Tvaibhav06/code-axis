import "server-only";
import { timingSafeEqual } from "node:crypto";
import { runPhase0Checks } from "@/server/phase0-checks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(request: Request) {
  const expected = process.env.PHASE0_SMOKE_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const valid = expected && expected.length >= 32 && supplied &&
    Buffer.byteLength(expected) === Buffer.byteLength(supplied) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
  if (!valid) return Response.json({ error: "Not authorised." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const report = await runPhase0Checks();
    return Response.json(report, { status: report.passed ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Setup verification could not finish. No successful connection is implied." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
