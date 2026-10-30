import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoSession } from "@/components/demo-controls";
import { DemoError, requireDemoContext } from "@/server/demo";
import { getDeskSnapshot } from "@/server/desk-snapshot";
import { WorkspaceEditor } from "@/components/workspace-editor";

export const dynamic = "force-dynamic";

export default async function Desk({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const query = await searchParams;
  let context;
  try { context = await requireDemoContext(); }
  catch (error) {
    if (error instanceof DemoError && error.status === 401) redirect("/");
    return <main className="wrap desk"><h1>Demo access is being prepared.</h1>
      <p>{error instanceof DemoError ? error.message : "We could not connect to the workspace. Please try again later."}</p>
      <Link href="/">Return to home</Link></main>;
  }
  let snapshot;
  try { snapshot = await getDeskSnapshot(context, query.campaign); }
  catch (error) {
    console.error("Desk snapshot load failed:", error);
    return <main className="wrap desk"><h1>Your workspace is not ready yet.</h1><p>The source library and campaign setup need to finish before editing is available.</p><Link href="/">Return to home</Link></main>;
  }
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header wrap"><Link className="brand" href="/">Brand Review Desk</Link><span className="sample-label">Fictional demo</span></header>
    <main className="wrap desk" id="main">
      <p className="eyebrow">Your isolated workspace</p><h1>{snapshot.state.workspaceName}</h1>
      <p>You are signed in as the <strong>{context.role}</strong>. Each demo role uses a separate account in this workspace.</p>
      <DemoSession role={context.role}>
      <p className="help-text">Fictional data only. Gemini free-tier inputs and responses may be used by Google to improve its products. AI attempts at page load: {context.lease.ai_attempts} / {context.lease.ai_attempt_limit}. Shared project quota also applies. Refresh the page to update this count.</p>
      <WorkspaceEditor key={`${context.lease.workspace_id}-${context.role}`} initialSnapshot={snapshot} role={context.role} userId={context.userId} />
      </DemoSession>
    </main>
  </>;
}
