export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ status: "ok", service: "brand-review-desk", scope: "application-shell-only" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
