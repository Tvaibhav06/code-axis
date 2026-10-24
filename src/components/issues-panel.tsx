"use client";
import type { SourceEntry } from "@/lib/content-schema";
import type { DeskSnapshot } from "@/lib/desk-snapshot";
export function IssuesPanel({ sources, rows, error, loading, refresh }: {
  sources: SourceEntry[]; rows: DeskSnapshot["issueRows"]; error: string; loading: boolean; refresh: () => Promise<void>;
}) {
  return <section className="editor-panel"><h2>Recurring issues and disputed rules</h2><p>Latest decision per finding, then each campaign/rule counts once in each column across repeated checks. These are historical learning signals, not the unresolved issues on the current draft.</p>
    <button className="text-button" disabled={loading} onClick={() => { void refresh().catch(() => {}); }}>{loading ? "Refreshing counts…" : "Refresh counts"}</button>
    {loading ? <p role="status">Loading issue counts…</p> : error ? <p role="alert" className="form-error">{error}</p> : rows.length ? <table><caption>Review decisions across this workspace</caption><thead><tr><th scope="col">Rule</th><th scope="col">Confirmed campaigns</th><th scope="col">Disputed campaigns</th></tr></thead><tbody>{rows.map((r) => <tr key={r.ruleId}><th scope="row">{sources.find((s) => s.id === r.ruleId)?.title || `Historical rule ${r.ruleId}`}</th><td>{r.confirmed}</td><td>{r.disputed}</td></tr>)}</tbody></table> : <p>No confirmed or disputed issues recorded yet.</p>}</section>;
}
