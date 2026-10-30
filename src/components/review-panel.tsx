"use client";
import { useState } from "react";
import { categoryLabels, type ReviewView } from "@/lib/review-schema";
import type { Campaign, DeskState } from "@/lib/content-schema";
import type { DemoRole } from "@/lib/demo-schema";
import { HumanReview } from "./human-review";
import { reviewPost } from "@/lib/review-client";
import { HistoryArchive } from "./history-archive";
function failureMessage(code: string | null) {
  if (!code) return "AI was switched off.";
  if (code === "session_or_global_allowance_unavailable" || code === "provider_quota") return "The AI allowance is unavailable or exhausted. Use exact checks and the manual reviewer checklist.";
  if (code === "provider_timeout") return "The AI provider did not reply in time. You can explicitly retry, choose the fallback, or switch AI off.";
  if (code.startsWith("provider_http_")) return "The AI provider is unavailable. Choose the fallback explicitly or continue with manual review.";
  if (code === "input_too_large_for_ai") return "The copy and sources are too large for this AI check. Shorten them or use manual review.";
  if (["invalid_or_unavailable_output", "incomplete_output"].includes(code)) return "The AI response could not be verified. It has not been treated as a clean result.";
  return "AI checks could not complete with the current service settings. Continue with exact checks and manual review.";
}
export function ReviewPanel({ campaign, state, role, reload, view, loading, loadError, aiAvailable, fallbackAvailable }: {
  campaign: Campaign; state: DeskState; role: DemoRole; reload: () => Promise<void>;
  view: ReviewView | null; loading: boolean; loadError: string; aiAvailable: boolean; fallbackAvailable: boolean;
}) {
  const runs = view?.runs || [];
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(false);
  const [consent, setConsent] = useState(false);
  const [model, setModel] = useState("primary");
  const latest = campaign.campaign_versions.find((v) => v.version === campaign.current_version)!;
  async function action(name: string, extra: object = {}) {
    setBusy(true); setError("");
    try {
      await reviewPost(name, { campaignId: campaign.id, version: campaign.current_version, ...extra });
      try { await reload(); } catch { throw new Error("Action saved, but the screen could not refresh. Use Load latest before retrying the action."); }
    }
    catch (error) { setError(error instanceof Error ? error.message : "Review action failed."); }
    finally { setBusy(false); }
  }
  const current = runs.find((r) => r.content_version_id === latest.id && r.rulebook_id === state.rulebooks[0]?.id);
  return <><section className="editor-panel" aria-labelledby="review-heading"><h2 id="review-heading">Check saved version {campaign.current_version}</h2>
    <p>Checks use saved copy and published sources. Editing the draft above does not change this review until you save.</p>
    {role === "creator" && <fieldset disabled={busy || loading || !!loadError || !state.rulebooks.length} className="plain-fieldset"><legend>Check settings</legend>
      <label className="check-label"><input type="checkbox" disabled={!aiAvailable} checked={aiAvailable && ai} onChange={(e) => setAi(e.target.checked)} />Include a real AI check</label>
      {!aiAvailable && <p className="help-text">AI is disabled on this server. Exact checks and the manual reviewer checklist are available.</p>}
      {ai && <>{fallbackAvailable ? <label>Model<select value={model} onChange={(e) => setModel(e.target.value)}><option value="primary">Configured primary</option><option value="fallback">Configured fallback (select explicitly)</option></select></label> : <p className="help-text">Using the configured primary model. No independent fallback is configured.</p>}<p className="help-text">No automatic retry or model switch. If the provider is unavailable, switch AI off for manual review. An explicit retry uses another attempt.</p>
        <label className="check-label"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />I am using fictional data. Google may use free-tier inputs and responses to improve its products.</label></>}
      <button className="button" disabled={aiAvailable && ai && !consent} onClick={() => action("check", { ai: aiAvailable && ai, consent, model })}>{busy ? "Working…" : "Run checks"}</button>
      <p className="help-text">Five free-tier attempts per demo session, subject to the shared quota. Provider failures count after an attempt is reserved. AI off keeps exact checks and requires manual review.</p></fieldset>}
    {loading && <p role="status">Loading saved checks…</p>}{(error || loadError) && <p role="alert" className="form-error">{error || loadError}</p>}
    {!loading && !loadError && !current && <p>No current check. Run checks again after changing copy or sources.</p>}
    {current && <><p role="status"><strong>{current.status === "complete" ? "AI check completed" : "Manual review required"}</strong> · {current.model || "AI off"} · {current.created_at}</p>
      {current.status !== "complete" && <p className="form-error">{failureMessage(current.error_code)} Exact results below remain available. This is not an AI pass.</p>}
      {current.findings.length === 0 && <p>No issues were returned by the checks that ran. A reviewer must still approve the campaign.</p>}
      <ul className="source-list">{current.findings.map((f) => <li key={f.id}><strong>{categoryLabels[f.category]}</strong> · {f.origin} · {f.blocking ? "Blocking until corrected or dismissed with a reason" : "Advisory"}{f.page ? ` · Page ${f.page}` : ""}
        <blockquote>{f.quote}</blockquote><p>{f.explanation}</p><small>Source: {state.rulebooks[0]?.entries.find((s) => s.id === f.rule_id)?.title || f.rule_id}</small>
        {f.suggestion && <><p>Suggested replacement: {f.suggestion}</p>{role === "creator" && <button disabled={busy} className="secondary-button" onClick={() => action("apply", { findingId: f.id })}>Apply to a new saved version</button>}</>}</li>)}</ul></>}
    {runs.length > 0 && <><p className="help-text">The most recent ten checks are loaded. Approval is verified independently on the server.</p><HistoryArchive key={runs[0]?.id} kind="checks" campaignId={campaign.id} /></>}
  </section><HumanReview key={`${current?.id || "none"}-${campaign.status}`} campaign={campaign} run={current} role={role} reload={reload}
    view={view} loading={loading} loadError={loadError} rulebookId={state.rulebooks[0]?.id} /></>;
}
