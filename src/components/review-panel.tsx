"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { runSchema, categoryLabels, type CheckRun } from "@/lib/review-schema";
import type { Campaign, DeskState } from "@/lib/content-schema";
import type { DemoRole } from "@/lib/demo-schema";
import { HumanReview } from "./human-review";

export async function reviewPost(action: string, input: unknown) {
  let response;
  try { response = await fetch(`/api/review/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(55_000) }); }
  catch { throw new Error("The action could not be confirmed. Load latest before retrying; a check may have used an attempt."); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.error || "The action could not be confirmed. Load latest before retrying.");
  return data.result;
}
export function ReviewPanel({ campaign, state, role, reload }: { campaign: Campaign; state: DeskState; role: DemoRole; reload: () => Promise<void> }) {
  const [runs, setRuns] = useState<CheckRun[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(true);
  const [consent, setConsent] = useState(false);
  const [model, setModel] = useState("primary");
  const latest = campaign.campaign_versions.find((v) => v.version === campaign.current_version)!;
  async function load() {
    const response = await fetch(`/api/review/history?campaign=${campaign.id}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Review history could not load.");
    setRuns(z.array(runSchema).parse(data.runs));
  }
  useEffect(() => {
    let active = true;
    fetch(`/api/review/history?campaign=${campaign.id}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Review history could not load."); return z.array(runSchema).parse(data.runs); })
      .then((data) => { if (active) setRuns(data); }).catch((error) => { if (active) setError(error instanceof Error ? error.message : "Review history could not load."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [campaign.id]);
  async function action(name: string, extra: object = {}) {
    setBusy(true); setError("");
    try { await reviewPost(name, { campaignId: campaign.id, version: campaign.current_version, ...extra }); await load(); await reload(); }
    catch (error) { setError(error instanceof Error ? error.message : "Review action failed."); }
    finally { setBusy(false); }
  }
  const current = runs.find((r) => r.content_version_id === latest.id && r.rulebook_id === state.rulebooks[0]?.id);
  return <><section className="editor-panel" aria-labelledby="review-heading"><h2 id="review-heading">Check saved version {campaign.current_version}</h2>
    <p>Checks use saved copy and published sources. Editing the draft above does not change this review until you save.</p>
    {role === "creator" && <fieldset disabled={busy || loading || !state.rulebooks.length} className="plain-fieldset"><legend>Check settings</legend>
      <label className="check-label"><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} />Include a real AI check</label>
      {ai && <><label>Model<select value={model} onChange={(e) => setModel(e.target.value)}><option value="primary">Primary (availability pending)</option><option value="fallback">Fallback (select explicitly)</option></select></label>
        <label className="check-label"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />I am using fictional data. Google may use free-tier inputs and responses to improve its products.</label></>}
      <button className="button" disabled={ai && !consent} onClick={() => action("check", { ai, consent, model })}>{busy ? "Working…" : "Run checks"}</button>
      <p className="help-text">Five free-tier attempts per demo session, subject to the shared quota. Provider failures count after an attempt is reserved. AI off keeps exact checks and requires manual review.</p></fieldset>}
    {loading && <p role="status">Loading saved checks…</p>}{error && <p role="alert" className="form-error">{error}</p>}
    {!loading && !current && <p>No current check. Run checks again after changing copy or sources.</p>}
    {current && <><p role="status"><strong>{current.status === "complete" ? "AI response validated" : "Manual review required"}</strong> · {current.model || "AI off"} · {current.created_at}</p>
      {current.status !== "complete" && <p className="form-error">{current.error_code || "AI was switched off."} Exact results below remain available. This is not an AI pass.</p>}
      {current.findings.length === 0 && <p>No issues were returned by the checks that ran. A reviewer must still approve the campaign.</p>}
      <ul className="source-list">{current.findings.map((f) => <li key={f.id}><strong>{categoryLabels[f.category]}</strong> · {f.origin} · {f.blocking ? "Blocking until corrected or dismissed with a reason" : "Advisory"}
        <blockquote>{f.quote}</blockquote><p>{f.explanation}</p><small>Source: {state.rulebooks[0]?.entries.find((s) => s.id === f.rule_id)?.title || f.rule_id}</small>
        {f.suggestion && <><p>Suggested replacement: {f.suggestion}</p>{role === "creator" && <button disabled={busy} className="secondary-button" onClick={() => action("apply", { findingId: f.id })}>Apply to a new saved version</button>}</>}</li>)}</ul></>}
    {runs.length > 0 && <details className="history"><summary>Saved check history ({runs.length})</summary>{runs.map((r) => <p key={r.id}>{r.created_at} · {r.status} · {r.findings.length} findings · {r.model || "AI off"}{r.id === current?.id ? " · current" : " · historical"}</p>)}</details>}
  </section><HumanReview key={`${current?.id || "none"}-${campaign.status}`} campaign={campaign} run={current} role={role} reload={reload} /></>;
}
