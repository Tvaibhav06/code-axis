import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { validateImage } from "../src/lib/image-validation";
import { samplecoSources } from "../src/lib/sampleco";
export async function assetPermissionChecks({ creator, reviewer, manager, admin, workspaceId, ownerId, check }: {
 creator: SupabaseClient; reviewer: SupabaseClient; manager: SupabaseClient; admin: SupabaseClient;
 workspaceId: string; ownerId: string; check: (name: string, passed: boolean) => void;
}) {
 const path = `${workspaceId}/${ownerId}/${randomUUID()}.png`;
 const bytes = await sharp({ create: { width: 32, height: 24, channels: 3, background: "white" } }).png().toBuffer();
 const metadata = await validateImage(bytes, "image/png");
 try {
  const uploaded = await creator.storage.from("brand-assets").upload(path, bytes, { contentType: "image/png" });
  check("Creator uploads the real decoded PNG privately", !uploaded.error);
  if (uploaded.error) throw new Error("asset fixture upload");
  const register = { p_workspace: workspaceId, p_owner: ownerId, p_path: path, p_mime: metadata.mime, p_bytes: metadata.bytes, p_width: metadata.width, p_height: metadata.height, p_sha256: metadata.sha256 };
  check("Browser cannot claim its own validation result", (await creator.rpc("register_validated_asset", register)).error?.code === "42501");
  check("Trusted server records validated image metadata", !(await admin.rpc("register_validated_asset", register)).error);
  const ws = await manager.from("workspaces").select("rulebook_version").eq("id", workspaceId).single();
  if (ws.error) throw new Error("asset fixture sources");
  const book = await manager.rpc("publish_brand_sources", { p_workspace: workspaceId, p_expected_version: ws.data.rulebook_version, p_entries: samplecoSources, p_logo: path, p_palette: ["#000000", "#ffffff"] });
  check("Manager publishes validated logo and palette", !book.error);
  if (book.error) throw new Error("asset fixture publication");
  const args = { p_workspace: workspaceId, p_campaign: null, p_expected_version: 0, p_title: "Private image permission fixture", p_purpose: "Verify image approval gates", p_audience: "Test reviewers", p_body: "Try SampleCo free for 14 days.", p_image: path, p_alt: "", p_review: { logo: false, spacing: false, readability: false, palette: false }, p_foreground: "#ffffff", p_background: "#ffffff" };
  const saved = await creator.rpc("save_campaign_with_asset", args);
  check("Creator saves image metadata in a numbered revision", !saved.error);
  if (saved.error) throw new Error("asset fixture campaign");
  const campaign = saved.data[0].campaign_id;
  async function submitAndApprove(version: number, versionId: string) {
   const run = await admin.rpc("record_check_run", { p_workspace: workspaceId, p_actor: ownerId, p_campaign: campaign, p_version: versionId, p_rulebook: book.data[0].id, p_status: "manual", p_model: null, p_error: null, p_supported: [], p_findings: [] });
   if (run.error) throw new Error("image manual permission fixture");
   const submitted = await creator.rpc("review_action", { p_campaign: campaign, p_expected_version: version, p_action: "submit", p_note: "Manual image permission fixture", p_finding: null });
   if (submitted.error) throw new Error("image fixture submit");
   return reviewer.rpc("approve_campaign", { p_campaign: campaign, p_expected_version: version, p_rulebook: book.data[0].id, p_run: run.data, p_checklist: { finalReview: true, facts: true, claims: true, tone: true } });
  }
  check("Missing alt text/manual checks prevent image approval", (await submitAndApprove(1, saved.data[0].version_id)).error?.code === "22023");
  const second = await creator.rpc("save_campaign_with_asset", { ...args, p_campaign: campaign, p_expected_version: 1, p_alt: "A white test square", p_review: { logo: true, spacing: true, readability: true, palette: true } });
  if (second.error) throw new Error("contrast permission fixture");
  check("Low contrast prevents approval even after manual checkboxes", (await submitAndApprove(2, second.data[0].version_id)).error?.code === "22023");
  const third = await creator.rpc("save_campaign_with_asset", { ...args, p_campaign: campaign, p_expected_version: 2, p_alt: "A white test square", p_review: { logo: true, spacing: true, readability: true, palette: true }, p_foreground: "#000000" });
  if (third.error) throw new Error("valid image permission fixture");
  check("Independent reviewer approves a validated image after checks", !(await submitAndApprove(3, third.data[0].version_id)).error);
  const old = await creator.from("campaign_versions").select("alt_text,foreground").eq("campaign_id", campaign).eq("version", 1).single();
  check("Old image metadata is preserved", !old.error && old.data.alt_text === "" && old.data.foreground === "#ffffff");
 } finally {
  // Verification-only image: remove after recording the test outcome, never a judge's asset.
  const cleanup = await admin.storage.from("brand-assets").remove([path]);
  check("Verification-only asset cleanup succeeds", !cleanup.error);
 }
}
