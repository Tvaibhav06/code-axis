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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await demoRequest("start");
      router.push("/desk");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please retry in a moment.");
      setBusy(false);
    }
  }
  return <div><button className="button" type="button" disabled={busy} onClick={() => void start()}>
    {busy ? "Opening your workspace…" : "Start demo"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}</div>;
}

export function DemoSession({ role, children }: { role: DemoRole; children: ReactNode }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  // The selector shows what the user asked for while the request is in flight,
  // then reverts to the server role if the switch failed. Showing the stale
  // requested value after a failure is what made the stall invisible.
  const [pendingRole, setPendingRole] = useState<DemoRole | null>(null);
  const displayedRole = busy && pendingRole ? pendingRole : role;
  // A role switch can stall in transit. On failure the session is unchanged, so
  // a single refresh is the correct recovery: it re-reads the server role.
  function recover() {
    setRetrying(true);
    startTransition(async () => {
      try { await router.refresh(); }
      finally { setRetrying(false); }
    });
  }
  function act(action: string, nextRole?: DemoRole) {
    setError("");
    setPendingRole(nextRole || null);
    startTransition(async () => {
      try {
        await demoRequest(action, nextRole);
        if (action === "end") router.replace("/");
        else router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Please retry in a moment.";
        setError(message);
        recover();
      }
    });
  }
  return <><div className="demo-controls">
    <label htmlFor="demo-role">Demo role</label>
    <select id="demo-role" value={displayedRole} disabled={busy} onChange={(event) => act("switch-role", event.target.value as DemoRole)}>
      {demoRoles.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
    </select>
    <button className="secondary-button" type="button" disabled={busy} onClick={() => act("end")}>End demo</button>
    {busy && <span role="status">{retrying ? "Retrying your sign-in…" : "Updating your sign-in…"}</span>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div><div inert={busy} aria-busy={busy} data-demo-pending={busy ? "true" : "false"}>{children}</div></>;
}
