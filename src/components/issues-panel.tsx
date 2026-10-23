"use client";
import { useState, useEffect } from "react";
import { z } from "zod";
import type { SourceEntry } from "@/lib/content-schema";
const rowsSchema = z.array(z.object({ ruleId: z.uuid(), confirmed: z.number().int().nonnegative(), disputed: z.number().int().nonnegative() }));
export function IssuesPanel({ sources }: { sources: SourceEntry[] }) {
  const [rows, setRows] = useState<z.infer<typeof rowsSchema>>([]); const [message, setMessage] = useState("Loading issue counts…");
  async function load() {
    const response = await fetch("/api/desk/issues", { cache: "no-store", signal: AbortSignal.timeout(20_000) }); const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Issue counts unavailable."); setRows(rowsSchema.parse(data.rows)); setMessage("");
  }
  useEffect(() => {
    let active = true;
    fetch("/api/desk/issues", { cache: "no-store", signal: AbortSignal.timeout(20_000) }).then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Issue counts unavailable."); return rowsSchema.parse(data.rows); })
      .then((rows) => { if (active) { setRows(rows); setMessage(""); } }).catch((e) => { if (active) setMessage(e instanceof Error ? e.message : "Issue counts unavailable."); });
    return () => { active = false; };
  }, []);
  return <section className="editor-panel"><h2>Recurring issues and disputed rules</h2><p>Latest decision per finding, then each campaign/rule counts once in each column across repeated checks. These are historical learning signals, not the unresolved issues on the current draft.</p>
    <button className="text-button" onClick={() => load().catch((e) => setMessage(e instanceof Error ? e.message : "Issue counts unavailable."))}>Refresh counts</button>
    {message ? <p role="status">{message}</p> : rows.length ? <table><caption>Review decisions across this workspace</caption><thead><tr><th scope="col">Rule</th><th scope="col">Confirmed campaigns</th><th scope="col">Disputed campaigns</th></tr></thead><tbody>{rows.map((r) => <tr key={r.ruleId}><th scope="row">{sources.find((s) => s.id === r.ruleId)?.title || `Historical rule ${r.ruleId}`}</th><td>{r.confirmed}</td><td>{r.disputed}</td></tr>)}</tbody></table> : <p>No confirmed or disputed issues recorded yet.</p>}</section>;
}
