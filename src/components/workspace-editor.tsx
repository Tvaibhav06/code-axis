"use client";

import { useRef, useState, type FormEvent } from "react";
import { sourceKinds, wordCount, type Campaign, type CampaignInput, type DeskState, type SourceEntry } from "@/lib/content-schema";
import { deskSnapshotSchema, type DeskSnapshot } from "@/lib/desk-snapshot";
import type { DemoRole } from "@/lib/demo-schema";
import { ReviewPanel } from "./review-panel";
import { AssetPreview, AssetUpload } from "./image-controls";
import { contrastRatio, emptyImageReview } from "@/lib/image-schema";
import { IssuesPanel } from "./issues-panel";
import { HistoryArchive } from "./history-archive";
import { ImageTextReview } from "./image-text-review";

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
  const [logoPath, setLogoPath] = useState<string | null>(data.rulebooks[0]?.logo_path || null);
  const [palette, setPalette] = useState((data.rulebooks[0]?.palette || []).join(", "));
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function update(index: number, values: Partial<SourceEntry>) {
    setEntries((previous) => previous.map((entry, position) => position === index ? { ...entry, ...values } : entry));
  }
  async function publish(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await post("sources", { expectedVersion: data.rulebookVersion, logoPath, palette: palette.split(",").map((s) => s.trim()).filter(Boolean), entries: entries.map((entry) => ({ ...entry, aliases: entry.aliases.map((alias) => alias.trim()).filter(Boolean) })) });
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
      <fieldset disabled={busy || uploading} className="plain-fieldset"><legend className="visually-hidden">Source entries</legend>
        <AssetUpload label="Approved brand logo (optional for text-only campaigns)" disabled={busy} onBusyChange={setUploading} onUploaded={setLogoPath} />
        <AssetPreview key={logoPath} path={logoPath} alt="Manager-approved brand logo" />
        {logoPath && <button type="button" className="text-button" onClick={() => setLogoPath(null)}>Remove logo from this draft</button>}
        <label>Approved palette (up to 6 comma-separated hex colours)<input value={palette} onChange={(e) => setPalette(e.target.value)} placeholder="#152238, #ffffff" /></label>
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
    </form> : data.rulebooks[0] ? <><AssetPreview path={data.rulebooks[0].logo_path} alt="Approved brand logo" /><p>Approved palette: {data.rulebooks[0].palette.join(", ") || "Not set"}</p><SourceList entries={data.rulebooks[0].entries} /></> : <p>No sources have been published. Switch to the manager to add them.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {data.rulebookVersion > 1 && <HistoryArchive kind="sources" />}
  </section>;
}

function CampaignEditor({ campaign, editable, reload, book }: { campaign?: Campaign; editable: boolean; reload: (id?: string) => Promise<void>; book?: DeskState["rulebooks"][number] }) {
  const latest = campaign?.campaign_versions.find((item) => item.version === campaign.current_version);
  const [draft, setDraft] = useState<CampaignInput>({ campaignId: campaign?.id || null, expectedVersion: campaign?.current_version || 0,
    title: latest?.title || "", purpose: latest?.purpose || "", audience: latest?.audience || "", body: latest?.body || "",
    imagePath: latest?.image_path || null, altText: latest?.alt_text || "", imageReview: latest?.image_review || emptyImageReview,
    foreground: latest?.foreground || "#000000", background: latest?.background || "#ffffff",
    documentPath: latest?.document_path || null, documentText: latest?.document_text || "", documentPages: latest?.document_pages || 0,
    imageText: latest?.image_text || "" });
  const [uploading, setUploading] = useState(false);
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
  return <section className="editor-panel" aria-labelledby="campaign-heading">
    <h2 id="campaign-heading">{latest?.title || "New campaign"} {campaign && <span className="version-label">Version {campaign.current_version} · {campaign.status === "approved" ? "approval recorded; see current status below" : campaign.status.replaceAll("_", " ")}</span>}</h2>
    {editable ? <form onSubmit={save}><fieldset disabled={busy || uploading} className="plain-fieldset"><legend className="visually-hidden">Campaign draft</legend>
      <div className="form-grid"><label className="full-width">Campaign title<input required maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>Purpose<input required maxLength={300} value={draft.purpose} onChange={(event) => setDraft({ ...draft, purpose: event.target.value })} /></label>
        <label>Audience<input required maxLength={300} value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} /></label>
        <label className="full-width">English campaign text<textarea required rows={9} value={draft.body} aria-describedby="word-count" onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label></div>
      <p id="word-count" className={wordCount(draft.body) > 1500 ? "form-error" : "help-text"}>{wordCount(draft.body)} / 1,500 words</p>
      <AssetUpload label="Optional campaign image" disabled={busy} onBusyChange={setUploading} onUploaded={(path) => setDraft((previous) => ({ ...previous, imagePath: path, imageReview: { ...emptyImageReview } }))} />
      {draft.imagePath && <><div className="image-comparison"><div><h3>Campaign image</h3><AssetPreview key={draft.imagePath} path={draft.imagePath} alt={draft.altText || "Campaign image awaiting alternative text"} /></div><div><h3>Approved logo and palette</h3><AssetPreview key={book?.logo_path} path={book?.logo_path || null} alt="Approved brand logo" /><p>{book?.palette.join(", ") || "Ask the manager to publish a logo and palette."}</p></div></div>
        <ImageTextReview key={draft.imagePath} imagePath={draft.imagePath} onConfirmed={(text) => setDraft((prev) => ({ ...prev, imageText: text }))} />
        <label>Alternative text (required for approval)<textarea maxLength={500} value={draft.altText} onChange={(e) => setDraft({ ...draft, altText: e.target.value })} /></label>
        <fieldset><legend>Manual image review</legend>{(["logo", "spacing", "readability", "palette"] as const).map((key) => <label key={key} className="check-label"><input type="checkbox" checked={draft.imageReview[key]} onChange={(e) => setDraft({ ...draft, imageReview: { ...draft.imageReview, [key]: e.target.checked } })} />{({ logo: "Logo matches the approved asset", spacing: "Logo spacing follows the published guidance", readability: "All image text is readable", palette: "Colours follow the approved palette" })[key]}</label>)}</fieldset>
        <div className="form-grid"><label>Text colour<input type="color" value={draft.foreground} onChange={(e) => setDraft({ ...draft, foreground: e.target.value })} /></label><label>Background colour<input type="color" value={draft.background} onChange={(e) => setDraft({ ...draft, background: e.target.value })} /></label></div>
        <p>Selected pair: {contrastRatio(draft.foreground, draft.background).toFixed(2)}:1 · {contrastRatio(draft.foreground, draft.background) >= 4.5 ? "Meets 4.5:1 for normal text" : "Below 4.5:1"}</p><p className="help-text">Select the actual text/background colours yourself. This checks one colour pair, not the whole image or full accessibility. Logo and readability checks are manual.</p>
        <button type="button" className="text-button" onClick={() => setDraft({ ...draft, imagePath: null, altText: "", imageReview: { ...emptyImageReview } })}>Remove image from this draft</button></>}
      <div className="form-actions"><button type="submit" className="button">{busy ? "Saving…" : `Save version ${draft.expectedVersion + 1}`}</button></div>
      <p className="help-text">Save explicitly to create a new version. Switching campaigns, roles or leaving this page discards unsaved edits.</p>
    </fieldset></form> : latest ? <div><p><strong>Purpose:</strong> {latest.purpose}<br /><strong>Audience:</strong> {latest.audience}</p><pre className="copy-preview">{latest.body}</pre><p>Only this campaign&apos;s creator can save revisions.</p></div> : <p>No campaign is selected. The creator can add a draft.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!editable && latest?.image_path && <><div className="image-comparison"><div><h3>Saved campaign image</h3><AssetPreview path={latest.image_path} alt={latest.alt_text || "Alternative text missing"} /></div><div><h3>Approved logo</h3><AssetPreview path={book?.logo_path || null} alt="Approved brand logo" /><p>Palette: {book?.palette.join(", ") || "Not set"}</p></div></div><p>Alternative text: {latest.alt_text || "Missing"}</p><p>Saved manual checks: {Object.entries(latest.image_review).map(([k, v]) => `${k}: ${v ? "checked" : "missing"}`).join("; ")}</p><p>Selected pair: {latest.foreground} / {latest.background} · {contrastRatio(latest.foreground, latest.background).toFixed(2)}:1</p></>}
    {campaign && campaign.current_version > 1 && <HistoryArchive key={`${campaign.id}-${campaign.current_version}`} kind="versions" campaignId={campaign.id} />}
  </section>;
}

export function WorkspaceEditor({ initialSnapshot, role, userId }: { initialSnapshot: DeskSnapshot; role: DemoRole; userId: string }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const state = snapshot.state;
  const [view, setView] = useState<"campaigns" | "sources">(role === "manager" ? "sources" : "campaigns");
  const [selected, setSelected] = useState(initialSnapshot.campaignId || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef<Promise<void> | null>(null);
  function reload(id?: string, offset = state.campaignOffset): Promise<void> {
    if (inFlight.current) return inFlight.current;
    const campaignId = id || selected;
    setPending(true); setMessage(""); setError("");
    const operation = (async () => {
      try {
        const params = new URLSearchParams({ offset: String(offset) });
        if (campaignId) params.set("campaign", campaignId);
        const response = await fetch(`/api/desk/snapshot?${params}`, { cache: "no-store", signal: AbortSignal.timeout(25_000) });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "The workspace could not reload.");
        const parsed = deskSnapshotSchema.safeParse(data);
        if (!parsed.success) throw new Error("Workspace data could not be read safely. Please reload.");
        setSnapshot(parsed.data);
        setSelected(parsed.data.campaignId || "");
        const url = new URL(window.location.href);
        if (parsed.data.campaignId) url.searchParams.set("campaign", parsed.data.campaignId); else url.searchParams.delete("campaign");
        window.history.replaceState(null, "", url.pathname + url.search);
        setMessage("Saved version loaded from the workspace.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "The workspace could not refresh. Please try Load latest again.";
        setSnapshot((previous) => ({ ...previous, review: null, reviewError: message, issueError: "Issue counts could not refresh. Use Refresh counts to retry." }));
        setError(message);
        throw new Error(message);
      } finally { setPending(false); inFlight.current = null; }
    })();
    inFlight.current = operation;
    return operation;
  }
  const campaign = state.campaigns.find((item) => item.id === selected);
  return <div className="workspace-content">
    <nav className="workspace-nav" aria-label="Workspace sections"><button className="secondary-button" disabled={pending} aria-pressed={view === "campaigns"} onClick={() => setView("campaigns")}>Campaigns</button><button className="secondary-button" disabled={pending} aria-pressed={view === "sources"} onClick={() => setView("sources")}>Brand sources</button>
      <button className="text-button" disabled={pending} onClick={() => { void reload().catch(() => {}); }}>Load latest</button>
      {pending && <span role="status">Refreshing workspace…</span>}</nav>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="form-error">{error}</p>}
    <div inert={pending} aria-busy={pending}>
    {view === "sources" ? <SourcesEditor key={`sources-${state.rulebookVersion}`} data={state} editable={role === "manager"} reload={reload} /> : <>
      <div className="campaign-picker"><label htmlFor="campaign-picker">Saved campaign</label><select id="campaign-picker" value={selected} onChange={(event) => {
        const id = event.target.value;
        if (!id) setSelected(""); else { void reload(id).catch(() => {}); }
      }}><option value="">New campaign</option>{state.campaigns.map((item) => <option key={item.id} value={item.id}>{item.campaign_versions.find((version) => version.version === item.current_version)?.title} · v{item.current_version}</option>)}</select></div>
      <div className="form-actions"><button className="text-button" disabled={pending || state.campaignOffset === 0} onClick={() => { void reload(undefined, Math.max(0, state.campaignOffset - 20)).catch(() => {}); }}>Newer campaigns</button>
        <button className="text-button" disabled={pending || !state.hasMoreCampaigns} onClick={() => { void reload(undefined, state.campaignOffset + 20).catch(() => {}); }}>Older campaigns</button></div>
      <CampaignEditor key={`${selected}-${campaign?.current_version || 0}-${state.rulebookVersion}`} book={state.rulebooks[0]} campaign={campaign} editable={role === "creator" && (!campaign || campaign.creator_id === userId)} reload={reload} />
      {campaign && <ReviewPanel key={`review-${campaign.id}-${campaign.current_version}-${state.rulebookVersion}`} campaign={campaign} state={state} role={role} reload={reload}
        view={snapshot.campaignId === campaign.id ? snapshot.review : null} loading={pending} loadError={snapshot.reviewError} aiAvailable={snapshot.aiAvailable} fallbackAvailable={snapshot.fallbackAvailable} />}
    </>}
    <IssuesPanel sources={state.rulebooks[0]?.entries || []} rows={snapshot.issueRows} error={snapshot.issueError} loading={pending} refresh={reload} />
    </div>
  </div>;
}
