import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoRoleControls } from "@/components/demo-controls";
import { DemoError, requireDemoContext } from "@/server/demo";

export const dynamic = "force-dynamic";

export default async function Desk() {
  let context;
  try { context = await requireDemoContext(); }
  catch (error) {
    if (error instanceof DemoError && error.status === 401) redirect("/");
    return <main className="wrap desk"><h1>Demo access is being prepared.</h1>
      <p>{error instanceof DemoError ? error.message : "We could not connect to the workspace. Please try again later."}</p>
      <Link href="/">Return to home</Link></main>;
  }
  const workspace = await context.client.from("workspaces").select("name").eq("id", context.lease.workspace_id).single();
  if (workspace.error || !workspace.data) return <main className="wrap desk"><h1>Your workspace could not load.</h1><p>Please refresh and try again.</p><Link href="/">Return to home</Link></main>;
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header wrap"><Link className="brand" href="/">Brand Review Desk</Link><span className="sample-label">Fictional demo</span></header>
    <main className="wrap desk" id="main">
      <p className="eyebrow">Your isolated workspace</p><h1>{workspace.data.name}</h1>
      <p>You are signed in as the <strong>{context.role}</strong>. Each demo role uses a separate account in this workspace.</p>
      <DemoRoleControls role={context.role} />
      <section className="foundation-note" aria-labelledby="workspace-status"><h2 id="workspace-status">Workspace connected</h2>
        <p>Your sign-in and role are connected to this workspace. The campaign editor and source library are the next planned build steps.</p>
        <p>AI checks used: {context.lease.ai_attempts} / {context.lease.ai_attempt_limit}. The review engine is not enabled yet.</p>
        <p>This demo uses fictional data only. Gemini free-tier inputs and responses may be used by Google to improve its products. Do not enter private or client information.</p>
      </section>
    </main>
  </>;
}
