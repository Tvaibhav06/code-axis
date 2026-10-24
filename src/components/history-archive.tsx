"use client";
import { useRef, useState } from "react";
import { archivePageSchema, type ArchiveKind, type ArchivePage } from "@/lib/archive-schema";
const labels = { sources: "Published source history", versions: "Saved content history", checks: "Full check history", events: "Full comments and decision history", approvals: "Full approval history" };
export function HistoryArchive({ kind, campaignId }: { kind: ArchiveKind; campaignId?: string }) {
  const [pages, setPages] = useState<ArchivePage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const exhausted = pages.length > 0 && pages.at(-1)!.nextOffset === null;
  async function load() {
    if (pending.current || exhausted) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const params = new URLSearchParams({ kind, offset: String(pages.at(-1)?.nextOffset || 0) });
      if (campaignId) params.set("campaign", campaignId);
      const response = await fetch(`/api/desk/archive?${params}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "History could not load.");
      const page = archivePageSchema.parse(data);
      if (page.kind !== kind) throw new Error("Unexpected history page. Retry.");
      setPages((previous) => [...previous, page]);
    } catch (error) { setError(error instanceof Error ? error.message : "History could not load."); }
    finally { setBusy(false); pending.current = false; }
  }
  return <details className="history"><summary>{labels[kind]}</summary>
    <p className="help-text">Load up to 20 records at a time. Older records stay available. New activity can move page boundaries; reload the campaign for its current state.</p>
    {pages.map((page, index) => <div key={index}>
      {page.kind === "sources" && page.rows.map((row) => <details key={row.id}><summary>Source version {row.version} · {row.published_at}</summary><ul className="source-list">{row.entries.map((entry) => <li key={entry.id}><strong>{entry.title}</strong><p>{entry.value}</p><small>Owner: {entry.owner} · Source: {entry.source}<br />Valid from {entry.validFrom || "unspecified"} through {entry.validUntil || "no end date"}</small></li>)}</ul></details>)}
      {page.kind === "versions" && page.rows.map((row) => <details key={row.id}><summary>Version {row.version} · {row.title}</summary><p>{row.purpose} · {row.audience}</p><pre className="copy-preview">{row.body}</pre><p>Alternative text: {row.alt_text || "No image description"}</p></details>)}
      {page.kind === "checks" && page.rows.map((row) => <details key={row.id}><summary>{row.created_at} · {row.status} · {row.findings.length} findings · {row.model || "AI off"}</summary><ul>{row.findings.map((f) => <li key={f.id}><blockquote>{f.quote}</blockquote><p>{f.explanation}</p><small>Source {f.rule_id} · {f.origin}</small></li>)}</ul></details>)}
      {page.kind === "events" && <ol>{page.rows.map((row) => <li key={row.id}>{row.created_at} · {row.actor_role} · {row.event_type.replaceAll("_", " ")}<p>{row.note}</p></li>)}</ol>}
      {page.kind === "approvals" && <ol>{page.rows.map((row) => <li key={row.id}>{row.approved_at} · {row.review_mode} · Reviewer {row.reviewer_id}<br /><small>Content {row.content_version_id} · Sources {row.rulebook_id}. This is a historical record; use the current approval status above.</small></li>)}</ol>}
    </div>)}
    {error && <p role="alert" className="form-error">{error}</p>}
    <button type="button" className="text-button" disabled={busy || exhausted} onClick={() => { void load(); }}>{busy ? "Loading history…" : exhausted ? "All records loaded" : pages.length ? "Load more history" : "Load history"}</button>
  </details>;
}
