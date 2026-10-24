import Link from "next/link";
import { StartDemo } from "@/components/demo-controls";
import { connection } from "next/server";

const steps = [
  ["01", "Start with your sources", "Keep approved facts, language and brand assets together."],
  ["02", "Review the evidence", "See what conflicts, what needs support and what could read better."],
  ["03", "Make a human decision", "Revise the draft and record who approved the exact version."],
];

export default async function Home() {
  await connection();
  const demoEnabled = process.env.DEMO_ACCESS_ENABLED === "true";
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header wrap">
        <Link className="brand" href="/" aria-label="Brand Review Desk home">
          <span className="brand-mark" aria-hidden="true">b.</span>
          <span>Brand Review Desk</span>
        </Link>
        <a className="quiet-link" href="#workflow">The workflow <span aria-hidden="true">↗</span></a>
      </header>
      <main id="main" className="wrap">
        <section className="hero" aria-labelledby="headline">
          <div className="hero-copy">
            <p className="eyebrow"><span className="dot" /> A clearer path to approval</p>
            <h1 id="headline">Good content.<br />Grounded in <em>your brand.</em></h1>
            <p className="lede">Give every campaign a second look. Check the claims, see the sources and keep the final decision with your team.</p>
            {demoEnabled ? <StartDemo /> : <a className="button" href="#example">See the review example <span aria-hidden="true">↘</span></a>}
            <p className="availability">{demoEnabled ? "Explore a fictional SampleCo workspace. No signup needed." : "The interactive demo is being prepared."}</p>
          </div>
          <article id="example" className="review-card" aria-labelledby="example-heading">
            <div className="card-top"><span className="overline">SampleCo / Campaign draft</span><span className="sample-label">Illustrative example</span></div>
            <h2 id="example-heading">A small claim.<br />Two different questions.</h2>
            <blockquote>“<mark>30 days free</mark> with <mark className="claim">guaranteed 50% savings.</mark>”</blockquote>
            <div className="finding"><span className="finding-icon conflict" aria-hidden="true">!</span><div><strong>Source conflict</strong><p>The approved trial lasts 14 days.</p><span className="source-label">Approved fact · Trial policy</span></div></div>
            <div className="finding"><span className="finding-icon evidence" aria-hidden="true">?</span><div><strong>Evidence missing</strong><p>The savings claim needs an approved source.</p><span className="source-label">Brand rule · Support numerical claims</span></div></div>
            <div className="suggestion"><span className="overline">A clearer starting point</span><p>“Try it free for 14 days.”</p></div>
            <p className="example-note">A fictional example of the planned review. No live check has run on this page.</p>
          </article>
        </section>
        <section id="workflow" className="workflow" aria-labelledby="workflow-heading">
          <div className="section-intro"><p className="eyebrow">The planned workflow</p><h2 id="workflow-heading">From draft to a decision<br />you can explain.</h2></div>
          <div className="steps">{steps.map(([number, title, description]) => <article key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
          <p className="ai-disclosure">The planned AI demo uses fictional data only. Gemini is on the free tier, where inputs and responses may be used by Google to improve its products. Do not enter private or client information.</p>
        </section>
      </main>
      <footer className="wrap footer"><span>Brand Review Desk</span><span>DIZZY DEV · CodeAxis 2026</span></footer>
    </>
  );
}
