import "server-only";
import { deskStateSchema, publishSourcesSchema, saveCampaignSchema } from "@/lib/content-schema";
import { DemoError, requireDemoContext } from "./demo";
import { isVersionConflict } from "@/lib/conflicts";

const campaignFields = "id,creator_id,current_version,status,campaign_versions(id,campaign_id,version,title,purpose,audience,body,created_at,image_path,alt_text,image_review,foreground,background,document_path,document_text,document_pages)";
export async function getDeskState(context: Awaited<ReturnType<typeof requireDemoContext>>, options: { campaignId?: string; offset?: number } = {}) {
  const { client, lease } = context;
  const offset = options.offset || 0;
  const campaignQuery = () => client.from("campaigns").select(campaignFields).eq("workspace_id", lease.workspace_id)
    .order("version", { referencedTable: "campaign_versions", ascending: false }).limit(1, { referencedTable: "campaign_versions" });
  const [workspace, rulebooks, campaigns] = await Promise.all([
    client.from("workspaces").select("name,rulebook_version").eq("id", lease.workspace_id).single(),
    client.from("rulebooks").select("id,version,entries,published_at,published_by,logo_path,palette").eq("workspace_id", lease.workspace_id).order("version", { ascending: false }).limit(1),
    campaignQuery().order("updated_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 20),
  ]);
  if (workspace.error || rulebooks.error || campaigns.error) throw new DemoError(503, "The source library or campaigns could not load. Please retry after setup is complete.");
  const page = campaigns.data.slice(0, 20);
  if (options.campaignId && !page.some((c) => c.id === options.campaignId)) {
    const selected = await campaignQuery().eq("id", options.campaignId).maybeSingle();
    if (selected.error) throw new DemoError(503, "The selected campaign could not load.");
    if (selected.data) page.push(selected.data);
  }
  const state = deskStateSchema.safeParse({ workspaceName: workspace.data.name, campaignOffset: offset, hasMoreCampaigns: campaigns.data.length > 20,
    rulebookVersion: workspace.data.rulebook_version, rulebooks: rulebooks.data, campaigns: page });
  if (!state.success) throw new DemoError(503, "Saved workspace data could not be read safely.");
  return state.data;
}

function mutationError(code?: string): never {
  if (isVersionConflict(code)) throw new DemoError(409, "This version changed. Load the latest workspace before saving again.");
  if (code === "42501") throw new DemoError(403, "Your role cannot make this change.");
  if (["22023", "22007", "22008", "22P02", "23514"].includes(code || "")) throw new DemoError(400, "Check the fields, dates and size limits before saving.");
  throw new DemoError(503, "The save could not be confirmed. Load the latest workspace before retrying.");
}

export async function publishSources(context: Awaited<ReturnType<typeof requireDemoContext>>, input: unknown) {
  if (context.role !== "manager") throw new DemoError(403, "Only the manager can publish approved sources.");
  const parsed = publishSourcesSchema.safeParse(input);
  if (!parsed.success) throw new DemoError(400, parsed.error.issues[0]?.message || "Check the source fields.");
  const result = await context.client.rpc("publish_brand_sources", { p_workspace: context.lease.workspace_id,
    p_expected_version: parsed.data.expectedVersion, p_entries: parsed.data.entries, p_logo: parsed.data.logoPath, p_palette: parsed.data.palette });
  if (result.error) mutationError(result.error.code);
  return result.data;
}

export async function saveCampaign(context: Awaited<ReturnType<typeof requireDemoContext>>, input: unknown) {
  if (context.role !== "creator") throw new DemoError(403, "Only the creator can save campaign drafts.");
  const parsed = saveCampaignSchema.safeParse(input);
  if (!parsed.success) throw new DemoError(400, parsed.error.issues[0]?.message || "Check the campaign fields.");
  const data = parsed.data;
  const result = await context.client.rpc("save_campaign_with_asset", { p_workspace: context.lease.workspace_id,
    p_campaign: data.campaignId, p_expected_version: data.expectedVersion,
    p_title: data.title, p_purpose: data.purpose, p_audience: data.audience, p_body: data.body,
    p_image: data.imagePath, p_alt: data.altText, p_review: data.imageReview, p_foreground: data.foreground, p_background: data.background,
    p_document: data.documentPath, p_document_text: data.documentText, p_document_pages: data.documentPages });
  if (result.error) mutationError(result.error.code);
  return result.data;
}
