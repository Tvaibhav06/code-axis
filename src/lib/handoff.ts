import type { DeskState } from "./content-schema";
import type { ReviewView } from "./review-schema";
export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
export function authenticatedCampaignUrl(site: string, campaign: string) {
  const url = new URL(site);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("HTTPS site URL required");
  if (url.username || url.password) throw new Error("Credentials are not allowed in site URLs");
  return `${url.origin}/desk?campaign=${encodeURIComponent(campaign)}`;
}
export function handoffHtml(state: DeskState, campaignId: string, review: ReviewView, site: string) {
  const approval = review.approval;
  const campaign = state.campaigns.find((c) => c.id === campaignId);
  const version = campaign?.campaign_versions.find((v) => v.version === campaign.current_version);
  const book = state.rulebooks.find((b) => b.id === approval?.approval?.rulebook_id);
  const run = review.runs.find((r) => r.id === approval?.approval?.run_id);
  if (!approval?.current || !approval.approval || !campaign || !version || !book || !run || version.id !== approval.approval.content_version_id || state.rulebookVersion !== book.version) throw new Error("Current approval required");
  const e = escapeHtml;
  const row = (key: string, value: unknown) => `<dt>${e(key)}</dt><dd>${e(value)}</dd>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${e(version.title)} — approved review record</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#152238}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f6f8;padding:20px}dt{font-weight:bold}dd{margin:0 0 12px}li{margin-bottom:16px}small{color:#465269}blockquote{border-left:3px solid #64748b;padding-left:16px;margin-left:0}</style></head><body>
  <p>Brand Review Desk · Fictional SampleCo demo</p><h1>${e(version.title)}</h1><p>This is a snapshot of an approved saved version, checked at ${e(approval.checked_at)}. Later edits, source changes, re-checks or expiry can invalidate approval in the app.</p>
  <dl>${row("Campaign", campaign.id)}${row("Content version", version.version)}${row("Purpose", version.purpose)}${row("Audience", version.audience)}${row("Source version", book.version)}${row("Check run", run.id)}${row("Review mode", approval.approval.review_mode)}${row("AI model", run.model || "AI off")}${row("AI outcome", run.status)}${row("Reviewer identity", approval.approval.reviewer_id)}${row("Approved at", approval.approval.approved_at)}${row("Approval ID", approval.approval.id)}</dl>
  <h2>Approved copy</h2><pre>${e(version.body)}</pre><h2>Image reference</h2><p>${version.image_path ? "The original image remains private in the authenticated app. It is not embedded in this record." : "Text-only campaign; no image attached."}</p>
  ${version.image_path ? `<dl>${row("Private image identifier", version.image_path)}${row("Alternative text", version.alt_text)}${row("Manual image checks", JSON.stringify(version.image_review))}${row("Selected colour pair", `${version.foreground} / ${version.background}`)}</dl>` : ""}
  <p><a href="${e(authenticatedCampaignUrl(site, campaign.id))}">Open this campaign in the authenticated workspace</a></p>
  <h2>Approved sources</h2><ul>${book.entries.map((s) => `<li><strong>${e(s.title)}</strong><br>${e(s.value)}<br>Owner: ${e(s.owner)} · Reference: ${e(s.source)}<br>Valid from: ${e(s.validFrom || "Unspecified")} · Through: ${e(s.validUntil || "No end date")} · ID: ${e(s.id)}</li>`).join("")}</ul>
  <h2>Findings and resolutions for this check</h2>${run.findings.length ? `<ul>${run.findings.map((f) => { const decision = review.events.filter((v) => v.finding_id === f.id && ["confirm", "dispute", "dismiss"].includes(v.event_type)).at(-1); return `<li><strong>${e(f.category)} · ${e(f.origin)}</strong><blockquote>${e(f.quote)}</blockquote>${e(f.explanation)}<br>Source ID: ${e(f.rule_id)}<br>Suggested replacement: ${e(f.suggestion || "None")}<br>Latest decision: ${e(decision?.event_type || "Advisory/unreviewed")} · ${e(decision?.note || "")}</li>`; }).join("")}</ul>` : "<p>No findings returned by the checks that ran. This is not a guarantee of complete correctness.</p>"}
  <h2>Decision trail</h2><ol>${review.events.map((v) => `<li>${e(v.created_at)} · ${e(v.actor_role)} · ${e(v.actor_id)} · ${e(v.event_type)}<br>Content snapshot: ${e(v.content_version_id)}<p>${e(v.note)}</p></li>`).join("")}</ol>
  <p><small>Manual visual checks and one selected colour-pair calculation do not establish full accessibility. AI suggestions support human review. Free-tier Gemini inputs and responses may be used by Google to improve its products.</small></p></body></html>`;
}
