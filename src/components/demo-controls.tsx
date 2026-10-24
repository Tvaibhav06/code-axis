"use client";

import { useState, useTransition, type ReactNode } from "react";
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
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  function start() {
    setError("");
    startTransition(async () => {
      try { await demoRequest("start"); router.push("/desk"); }
      catch (error) { setError(error instanceof Error ? error.message : "Please retry in a moment."); }
    });
  }
  return <div><button className="button" type="button" disabled={busy} onClick={start}>
    {busy ? "Opening your workspace…" : "Start demo"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}</div>;
}

export function DemoSession({ role, children }: { role: DemoRole; children: ReactNode }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  function act(action: string, nextRole?: DemoRole) {
    setError("");
    startTransition(async () => {
      try {
        await demoRequest(action, nextRole);
        if (action === "end") router.replace("/");
        else router.refresh();
      } catch (error) { setError(error instanceof Error ? error.message : "Please retry in a moment."); }
    });
  }
  return <><div className="demo-controls">
    <label htmlFor="demo-role">Demo role</label>
    <select id="demo-role" value={role} disabled={busy} onChange={(event) => act("switch-role", event.target.value as DemoRole)}>
      {demoRoles.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
    </select>
    <button className="secondary-button" type="button" disabled={busy} onClick={() => act("end")}>End demo</button>
    {busy && <span role="status">Updating your sign-in…</span>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div><div inert={busy} aria-busy={busy} data-demo-pending={busy ? "true" : "false"}>{children}</div></>;
}
