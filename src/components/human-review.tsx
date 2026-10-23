"use client";
import { useEffect, useState } from "react";
import { reviewViewSchema, type ReviewView, type CheckRun } from "@/lib/review-schema";
import type { Campaign } from "@/lib/content-schema";
import type { DemoRole } from "@/lib/demo-schema";
import { reviewPost } from "@/lib/review-client";

export function HumanReview({ campaign, run, role, reload }: { campaign: Campaign; run?: CheckRun; role: DemoRole; reload: () => Promise<void> }) {
  const [view, setView] = useState<ReviewView | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState({ finalReview: false, facts: false, claims: false, tone: false });
  const url = `/api/review/history?campaign=${campaign.id}`;
  useEffect(() => {
    let active = true;
    fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) }).then(async (r) => {
      const data = await r.json(); if (!r.ok) throw new Error(data.error || "Review state unavailable."); return reviewViewSchema.parse(data);
    }).then((data) => { if (active) setView(data); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "Review state unavailable."); });
    return () => { active = false; };
  }, [url]);
  async function act(action: string, findingId?: string) {
    setBusy(true); setError("");
    try {
      if (action === "approve") await reviewPost("approve", { campaignId: campaign.id, version: campaign.current_version, rulebookId: run?.rulebook_id, runId: run?.id, checklist: checks });
      else await reviewPost("human", { campaignId: campaign.id, version: campaign.current_version, action, note: note.trim(), findingId: findingId || null });
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error("Action saved, but the screen could not refresh. Load latest.");
      setView(reviewViewSchema.parse(await response.json())); setNote(""); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Review action failed."); }
    finally { setBusy(false); }
  }
  const approvals = view?.approval;
  async function download() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/export/${campaign.id}`, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Export failed."); }
      const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `BrandReview_${campaign.id}_v${campaign.current_version}.html`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) { setError(e instanceof Error ? e.message : "The download could not finish."); }
    finally { setBusy(false); }
  }
  return <section className="editor-panel"><h2>Human review and handoff</h2>
    <p><strong>{approvals?.current ? "Approved for this saved version" : "No current approval"}</strong><br />{approvals?.reason || "Loading approval status…"}</p>
    {approvals && <small>Recomputed at {approvals.checked_at}. Reload before relying on this status.</small>}
    {approvals?.approval && <p>Last approval: {approvals.approval.approved_at} · {approvals.approval.review_mode === "manual" ? "Manual review (AI incomplete/off)" : "AI-assisted human review"} · Reviewer {approvals.approval.reviewer_id}</p>}
    {approvals?.current && <><button className="button" disabled={busy} onClick={download}>Download approved HTML record</button><p className="help-text">Approval is checked again before download. The original image stays private in this workspace.</p></>}
    <fieldset disabled={busy || !view} className="plain-fieldset"><legend>Record a review action</legend>
      <label>Comment or reason (required for decisions)<textarea rows={3} maxLength={1500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="form-actions"><button className="secondary-button" disabled={!note.trim()} onClick={() => act("comment")}>Add comment</button>
        <button className="secondary-button" disabled={!note.trim()} onClick={() => act("clarification_request")}>Ask manager for clarification</button>
        {role === "manager" && <button className="secondary-button" disabled={!note.trim()} onClick={() => act("clarification_answer")}>Record manager clarification</button>}
        {role === "creator" && <button className="button" disabled={!note.trim() || !run} onClick={() => act("submit")}>Submit saved version for review</button>}
        {role === "reviewer" && <button className="secondary-button" disabled={!note.trim()} onClick={() => act("request_changes")}>Request changes</button>}</div>
      <p className="help-text">Clarifications are notes only. To change an approved fact, the manager must publish a new source version.</p>
      {role === "reviewer" && run && <><h3>Finding decisions</h3><p>Confirmed or disputed blocking issues remain unresolved. Correct them in a new version, or dismiss a false alarm with a reason.</p>
        <ul className="source-list">{run.findings.map((f) => <li key={f.id}><blockquote>{f.quote}</blockquote><p>{f.explanation}</p>
          <small>Latest decision: {view?.events.filter((e) => e.finding_id === f.id && ["confirm", "dispute", "dismiss"].includes(e.event_type)).at(-1)?.event_type || "unreviewed"}</small>
          <div className="form-actions">{["confirm", "dispute", "dismiss"].map((decision) => <button key={decision} className="secondary-button" disabled={!note.trim()} onClick={() => act(decision, f.id)}>{decision === "dismiss" ? "Dismiss false alarm" : decision === "confirm" ? "Confirm issue" : "Dispute rule"}</button>)}</div></li>)}</ul>
        {run.status !== "complete" && <fieldset><legend>Manual review required because AI did not complete</legend>{(["facts", "claims", "tone"] as const).map((key) => <label className="check-label" key={key}><input type="checkbox" checked={checks[key]} onChange={(e) => setChecks({ ...checks, [key]: e.target.checked })} />I checked {key === "facts" ? "all facts against current sources" : key === "claims" ? "claims and their evidence" : "tone and messaging manually"}.</label>)}</fieldset>}
        <label className="check-label"><input type="checkbox" checked={checks.finalReview} onChange={(e) => setChecks({ ...checks, finalReview: e.target.checked })} />I reviewed the saved copy, sources and any image checks.</label>
        <button className="button" disabled={!checks.finalReview || campaign.status !== "submitted" || (run.status !== "complete" && !(checks.facts && checks.claims && checks.tone))} onClick={() => act("approve")}>Approve saved version</button></>}
    </fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    {view && <details className="history"><summary>Comments and decision history ({view.events.length})</summary><ol>{view.events.map((event) => <li key={event.id}><strong>{event.actor_role} · {event.event_type.replaceAll("_", " ")}</strong> · {event.created_at}<p>{event.note}</p></li>)}</ol></details>}
    {view && view.approvals.length > 0 && <details className="history"><summary>Recorded approvals ({view.approvals.length})</summary><ol>{view.approvals.map((a) => <li key={a.id}>{a.approved_at} · {a.review_mode} · reviewer {a.reviewer_id}<br /><small>Content snapshot {a.content_version_id} · Source snapshot {a.rulebook_id} · {a.id === approvals?.approval?.id && approvals.current ? "Current on last check" : "Historical"}</small></li>)}</ol></details>}
  </section>;
}
