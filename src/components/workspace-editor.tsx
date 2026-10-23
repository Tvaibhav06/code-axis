"use client";

import { useState, type FormEvent } from "react";
import { deskStateSchema, sourceKinds, wordCount, type Campaign, type CampaignInput, type DeskState, type SourceEntry } from "@/lib/content-schema";
import type { DemoRole } from "@/lib/demo-schema";
import { ReviewPanel } from "./review-panel";

const kindLabels = { terminology: "Approved name", trial_days: "Trial days", monthly_price: "Monthly price (INR)",
  offer: "Offer/code", tone: "Tone guidance", evidence: "Evidence requirement" };

async function post(action: string, body: unknown) {
  let response;
  try { response = await fetch(`/api/desk/${action}`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(25_000) }); }
  catch { throw new Error("The save could not be confirmed. Use Load latest before retrying."); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.error || "The save could not be confirmed. Use Load latest before retrying.");
  return data;
}

function SourceList({ entries }: { entries: SourceEntry[] }) {
  return <ul className="source-list">{entries.map((entry) => <li key={entry.id}>
    <strong>{entry.title}</strong><p>{entry.value}</p><small>{kindLabels[entry.kind]} · Owner: {entry.owner}<br />Source: {entry.source}<br />
      {entry.validFrom ? `From ${entry.validFrom}. ` : ""}{entry.validUntil ? `Valid through ${entry.validUntil} (UTC).` : "No end date recorded."}
      {entry.aliases.length > 0 && <><br />Names to replace: {entry.aliases.join(", ")}</>}</small>
  </li>)}</ul>;
}

function SourcesEditor({ data, editable, reload }: { data: DeskState; editable: boolean; reload: () => Promise<void> }) {
  const [entries, setEntries] = useState<SourceEntry[]>(data.rulebooks[0]?.entries || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function update(index: number, values: Partial<SourceEntry>) {
    setEntries((previous) => previous.map((entry, position) => position === index ? { ...entry, ...values } : entry));
  }
  async function publish(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await post("sources", { expectedVersion: data.rulebookVersion, entries: entries.map((entry) => ({ ...entry, aliases: entry.aliases.map((alias) => alias.trim()).filter(Boolean) })) });
      try { await reload(); } catch { throw new Error("The source version was published, but the screen could not refresh. Use Load latest."); }
    }
    catch (error) { setError(error instanceof Error ? error.message : "Publication failed."); }
    finally { setBusy(false); }
  }
  return <section className="editor-panel" aria-labelledby="sources-heading">
    <h2 id="sources-heading">Brand sources <span className="version-label">{data.rulebookVersion ? `Version ${data.rulebookVersion}` : "Unpublished"}</span></h2>
    <p>Approved facts and guidance used to review SampleCo campaigns. Past published versions stay readable.</p>
    {editable ? <form onSubmit={publish}>
      <p className="help-text">Editing changes your draft only. Publish to create a new source version. Switching roles or leaving the page discards unpublished edits.</p>
      <fieldset disabled={busy} className="plain-fieldset"><legend className="visually-hidden">Source entries</legend>
        {entries.map((entry, index) => <fieldset className="source-form" key={entry.id}>
          <legend>Source {index + 1}</legend><div className="form-grid">
            <label>Type<select value={entry.kind} onChange={(event) => update(index, { kind: event.target.value as SourceEntry["kind"] })}>
              {sourceKinds.map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</select></label>
            <label>Title<input required maxLength={80} value={entry.title} onChange={(event) => update(index, { title: event.target.value })} /></label>
            <label className="full-width">Approved wording or value<textarea required maxLength={500} rows={2} value={entry.value} onChange={(event) => update(index, { value: event.target.value })} /></label>
            <label>Owner<input required maxLength={100} value={entry.owner} onChange={(event) => update(index, { owner: event.target.value })} /></label>
            <label>Source/reference<input required maxLength={200} value={entry.source} onChange={(event) => update(index, { source: event.target.value })} /></label>
            <label>Valid from (UTC)<input type="date" value={entry.validFrom || ""} onChange={(event) => update(index, { validFrom: event.target.value || null })} /></label>
            <label>Valid through (UTC)<input type="date" value={entry.validUntil || ""} onChange={(event) => update(index, { validUntil: event.target.value || null })} /></label>
            {entry.kind === "terminology" && <label className="full-width">Names to replace (comma separated, up to 8)<input value={entry.aliases.join(",")} onChange={(event) => update(index, { aliases: event.target.value.split(",") })} /></label>}
          </div><button type="button" className="text-button" onClick={() => setEntries((items) => items.filter((item) => item.id !== entry.id))}>Remove from draft</button>
        </fieldset>)}
        <div className="form-actions"><button type="button" className="secondary-button" disabled={entries.length >= 30} onClick={() => setEntries((items) => [...items, {
          id: crypto.randomUUID(), kind: "tone", title: "", value: "", owner: "", source: "", validFrom: null, validUntil: null, aliases: [],
        }])}>Add source ({entries.length}/30)</button>
          <button type="submit" className="button" disabled={!entries.length}>{busy ? "Publishing…" : `Publish source version ${data.rulebookVersion + 1}`}</button></div>
      </fieldset>
    </form> : data.rulebooks[0] ? <SourceList entries={data.rulebooks[0].entries} /> : <p>No sources have been published. Switch to the manager to add them.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {data.rulebooks.length > 1 && <details className="history"><summary>Past published source versions</summary>{data.rulebooks.slice(1).map((book) => <details key={book.id}><summary>Version {book.version} · {book.published_at}</summary><SourceList entries={book.entries} /></details>)}</details>}
  </section>;
}

function CampaignEditor({ campaign, editable, reload }: { campaign?: Campaign; editable: boolean; reload: (id?: string) => Promise<void> }) {
  const latest = campaign?.campaign_versions.find((item) => item.version === campaign.current_version);
  const [draft, setDraft] = useState<CampaignInput>({ campaignId: campaign?.id || null, expectedVersion: campaign?.current_version || 0,
    title: latest?.title || "", purpose: latest?.purpose || "", audience: latest?.audience || "", body: latest?.body || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await post("campaigns", draft);
      try { await reload(result.result?.[0]?.campaign_id); } catch { throw new Error("The campaign version was saved, but the screen could not refresh. Use Load latest."); }
    }
    catch (error) { setError(error instanceof Error ? error.message : "Save failed."); }
    finally { setBusy(false); }
  }
  const versions = campaign?.campaign_versions.slice().sort((a, b) => b.version - a.version) || [];
  return <section className="editor-panel" aria-labelledby="campaign-heading">
    <h2 id="campaign-heading">{latest?.title || "New campaign"} {campaign && <span className="version-label">Version {campaign.current_version} · {campaign.status.replaceAll("_", " ")}</span>}</h2>
    {editable ? <form onSubmit={save}><fieldset disabled={busy} className="plain-fieldset"><legend className="visually-hidden">Campaign draft</legend>
      <div className="form-grid"><label className="full-width">Campaign title<input required maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>Purpose<input required maxLength={300} value={draft.purpose} onChange={(event) => setDraft({ ...draft, purpose: event.target.value })} /></label>
        <label>Audience<input required maxLength={300} value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} /></label>
        <label className="full-width">English campaign text<textarea required rows={9} value={draft.body} aria-describedby="word-count" onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label></div>
      <p id="word-count" className={wordCount(draft.body) > 1500 ? "form-error" : "help-text"}>{wordCount(draft.body)} / 1,500 words</p>
      <div className="form-actions"><button type="submit" className="button">{busy ? "Saving…" : `Save version ${draft.expectedVersion + 1}`}</button></div>
      <p className="help-text">Save explicitly to create a new version. Switching campaigns, roles or leaving this page discards unsaved edits.</p>
    </fieldset></form> : latest ? <div><p><strong>Purpose:</strong> {latest.purpose}<br /><strong>Audience:</strong> {latest.audience}</p><pre className="copy-preview">{latest.body}</pre><p>Only this campaign&apos;s creator can save revisions.</p></div> : <p>No campaign is selected. The creator can add a draft.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {versions.length > 1 && <details className="history"><summary>Previous saved versions</summary>{versions.slice(1).map((version) => <details key={version.id}><summary>Version {version.version} · {version.title}</summary><p>{version.purpose} · {version.audience}</p><pre className="copy-preview">{version.body}</pre></details>)}</details>}
  </section>;
}

export function WorkspaceEditor({ initialState, role, userId }: { initialState: DeskState; role: DemoRole; userId: string }) {
  const [state, setState] = useState(initialState);
  const [view, setView] = useState<"campaigns" | "sources">(role === "manager" ? "sources" : "campaigns");
  const [selected, setSelected] = useState(initialState.campaigns[0]?.id || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function reload(id?: string) {
    let response;
    try { response = await fetch("/api/desk/state", { cache: "no-store", signal: AbortSignal.timeout(25_000) }); }
    catch { throw new Error("The workspace could not refresh. Please try Load latest again."); }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "The workspace could not reload.");
    const parsed = deskStateSchema.safeParse(data);
    if (!parsed.success) throw new Error("Workspace data could not be read safely. Please reload.");
    setState(parsed.data);
    if (id) setSelected(id);
    setMessage("Saved version loaded from the workspace."); setError("");
  }
  const campaign = state.campaigns.find((item) => item.id === selected);
  return <div className="workspace-content">
    <nav className="workspace-nav" aria-label="Workspace sections"><button className="secondary-button" aria-pressed={view === "campaigns"} onClick={() => setView("campaigns")}>Campaigns</button><button className="secondary-button" aria-pressed={view === "sources"} onClick={() => setView("sources")}>Brand sources</button>
      <button className="text-button" onClick={() => reload().catch((error) => setError(error instanceof Error ? error.message : "Refresh failed."))}>Load latest</button></nav>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="form-error">{error}</p>}
    {view === "sources" ? <SourcesEditor key={`sources-${state.rulebookVersion}`} data={state} editable={role === "manager"} reload={reload} /> : <>
      <div className="campaign-picker"><label htmlFor="campaign-picker">Saved campaign</label><select id="campaign-picker" value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">New campaign</option>{state.campaigns.map((item) => <option key={item.id} value={item.id}>{item.campaign_versions.find((version) => version.version === item.current_version)?.title} · v{item.current_version}</option>)}</select></div>
      <CampaignEditor key={`${selected}-${campaign?.current_version || 0}`} campaign={campaign} editable={role === "creator" && (!campaign || campaign.creator_id === userId)} reload={reload} />
      {campaign && <ReviewPanel key={`review-${campaign.id}-${campaign.current_version}-${state.rulebookVersion}`} campaign={campaign} state={state} role={role} reload={reload} />}
    </>}
  </div>;
}
