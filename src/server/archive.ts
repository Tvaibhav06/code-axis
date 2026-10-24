import "server-only";
import { archivePageSchema, archiveQuerySchema } from "@/lib/archive-schema";
import { DemoError, requireDemoContext } from "./demo";
export async function getArchive(context: Awaited<ReturnType<typeof requireDemoContext>>, params: URLSearchParams) {
  const parsed = archiveQuerySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) throw new DemoError(400, "Choose a valid history page of up to 20 records.");
  const { kind, campaign, offset, limit } = parsed.data;
  const { client, lease } = context;
  if (campaign) {
    const own = await client.from("campaigns").select("id").eq("workspace_id", lease.workspace_id).eq("id", campaign).maybeSingle();
    if (own.error) throw new DemoError(503, "History access could not be verified. Retry.");
    if (!own.data) throw new DemoError(404, "Campaign not found in this workspace.");
  }
  const query = kind === "sources" ? client.from("rulebooks").select("*").eq("workspace_id", lease.workspace_id).order("version", { ascending: false })
    : kind === "versions" ? client.from("campaign_versions").select("*").eq("campaign_id", campaign!).order("version", { ascending: false })
    : kind === "checks" ? client.from("check_runs").select("*,findings(*)").eq("workspace_id", lease.workspace_id).eq("campaign_id", campaign!).order("created_at", { ascending: false }).order("id", { ascending: false })
    : kind === "events" ? client.from("review_events").select("*").eq("workspace_id", lease.workspace_id).eq("campaign_id", campaign!).order("created_at", { ascending: false }).order("id", { ascending: false })
    : client.from("approvals").select("*").eq("workspace_id", lease.workspace_id).eq("campaign_id", campaign!).order("approved_at", { ascending: false }).order("id", { ascending: false });
  const result = await query.range(offset, offset + limit);
  if (result.error) throw new DemoError(503, "History could not load. Retry this page.");
  return archivePageSchema.parse({ kind, rows: result.data.slice(0, limit), nextOffset: result.data.length > limit ? offset + limit : null });
}
