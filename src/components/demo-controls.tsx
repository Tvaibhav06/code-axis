"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { demoRoles, type DemoRole } from "@/lib/demo-schema";

async function demoRequest(action: string, role?: DemoRole) {
  const response = await fetch(`/api/demo/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(role ? { role } : {}), signal: AbortSignal.timeout(35_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Demo access could not finish. Please retry.");
}

export function StartDemo() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    setBusy(true); setError("");
    try { await demoRequest("start"); router.push("/desk"); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Please retry in a moment."); }
    finally { setBusy(false); }
  }
  return <div><button className="button" type="button" disabled={busy} onClick={start}>
    {busy ? "Opening your workspace…" : "Start demo"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}</div>;
}

export function DemoRoleControls({ role }: { role: DemoRole }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(action: string, nextRole?: DemoRole) {
    setBusy(true); setError("");
    try {
      await demoRequest(action, nextRole);
      if (action === "end") router.push("/");
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Please retry in a moment."); }
    finally { setBusy(false); }
  }
  return <div className="demo-controls">
    <label htmlFor="demo-role">Demo role</label>
    <select id="demo-role" value={role} disabled={busy} onChange={(event) => act("switch-role", event.target.value as DemoRole)}>
      {demoRoles.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
    </select>
    <button className="secondary-button" type="button" disabled={busy} onClick={() => act("end")}>End demo</button>
    {busy && <span role="status">Updating your sign-in…</span>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
