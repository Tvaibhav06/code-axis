# Brand Review Desk: feasible Round 2 build plan

**Team:** DIZZY DEV
**Participant:** Vaibhav Tandon | **Email:** 24ucc077@lnmiit.ac.in
**Revised:** 23 October 2026, incorporating the agreed cut ladder and Phase 0 start
**Budget:** 26 focused hours, including checks and submission preparation, plus 4 hours of repair reserve. **Total: 30 hours.**
**Status:** Phases 1–5 have local rule, real-permission and manual browser evidence. Phase 6 is partial: the ten-draft pilot and real-AI browser attempt failed the provider-reliability gate. See docs/PHASE6_VERIFICATION.md for measured results, original failures and remaining checks. Deployment is deferred at the owner's request; no full release or submission readiness is claimed.

## 1. What this revision changes

Build one complete journey: **approved sources → campaign text and optional image → explainable checks → revision → independent approval → downloadable review record**.

The previous plan introduced too much infrastructure for the remaining solo build. This revision retains the qualified prototype's capabilities and removes work unnecessary to demonstrate them. The controlling baseline is the submitted DIZZYDEV_round1.pdf, the Inkloom AI problem statement and the organiser's Round 2 instructions.

| Previous approach | Revised decision | Quality retained |
|---|---|---|
| Custom locking/concurrency strategy | One approve function with a campaign-row lock and conditional version check/write | Approval references the versions actually reviewed |
| Expiry boundary and controlled-clock tests | Compute expiry on load, approve and export; manually check an expired fact | Expired support cannot silently stay current |
| AI run-key/validity caching | Run on demand; no cache or automatic retry | Results retain their content/source versions |
| On-demand Auth provisioning | Pre-provisioned sandbox pool only | Immediate entry with real, separate role identities |
| CI and broad DB integration suite | Local checks and three test groups | Rules, actual permissions and one browser journey |
| Full 24-draft evaluation in Round 2 | 10-draft pilot now; fresh 24-draft evaluation in Round 3 | Evidence at both stages, with the deferral disclosed |
| Browser-assembled export package | One downloadable HTML record | Approved copy, evidence and decision history |
| Durable bulk re-review in Round 3 | Manager-confirmed guideline import | Useful onboarding without a job queue |
| Northstar Notes fixture | SampleCo, retaining the 14-versus-30-day example | Proposal continuity |

No job queue, vector database, separate backend, account-signup flow, real-time collaboration, custom word-diff component, bespoke design system or general document parser in Round 2.

The site's guidance favours a dependable workflow, requires significant AI/reuse disclosure, and makes the three Round 2 improvement commitments part of Round 3 evaluation. Preserve those priorities. [Official CodeAxis guidance](https://wecodecoders.in/events/code-axis)

### Judging alignment

| Criterion | Marks | Evidence | Main phases |
|---|---:|---|---|
| Working core workflow | 30 | Open link, check saved campaign, revise, obtain independent approval, export | 1–5 |
| Technical depth and reliability | 25 | Real AI, valid citations, server/DB permissions, private files, honest failure states | 0–6 |
| Progress from Round 1 | 20 | R01–R13 mapped to actual completion evidence and explained changes | All; reconcile in 7 |
| Three planned improvements | 15 | Exactly three useful, bounded additions with acceptance tests | Section 7; confirm in Phase 7 |
| Usability | 10 | Self-service access, clear next action, labelled controls and understandable results | 1–6 |

The first 55 marks determine the build order. Tables and reusable form components are sufficient. Repair time is reserved for defects, not visual polish.

## 2. Round 1 continuity and Round 2 scope

**Status reflects implementation, not a completion claim.** Partial includes prepared code whose service/browser gates remain unverified. No row is Complete merely because code compiles. See BUILD_LOG.md for evidence.

| ID | Round 1 promise | Round 2 status/scope | Reason or change |
|---|---|---|---|
| R01 | One brand; creator, manager and reviewer | Partial: identity/lease/RLS foundation and pre-seed code prepared | Real seeded-account/isolation tests pending setup |
| R02 | Up to 30 short rules/facts, owners, sources, dates, logo and palette | Partial: source publications and validated private logo/palette controls prepared | Input boundaries pass locally; live persistence/asset permissions pending |
| R03 | English text up to 1,500 words; optional PNG/JPG up to 5 MB | Partial: numbered text/image saves and real decoder validation prepared | Local size/type/decoder tests pass; deployed private uploads pending |
| R04 | Exact terminology and fact checks | Partial: Phase 3 checks prepared and tested locally | No claim of general fact verification; live saved results pending |
| R05 | AI tone, messaging and unsupported-claim suggestions | Partial: real request, limits, explicit model selection and failure path prepared | Earlier 3.6 connectivity fixture passed; product accuracy/live journey pending |
| R06 | Three finding categories, quotes, sources, suggested fixes | Partial: source/span validation and explicit new-version correction prepared | Invalid output rejection passes locally; live persistence pending |
| R07 | Comments, disputes, revisions and independent approval | Partial: decision history and independent approval prepared | Role/transaction tests prepared; execution pending service setup |
| R08 | Content/source changes invalidate approval | Partial: fresh approval-state function prepared | Edit/source/re-check/expiry paths await real database verification |
| R09 | Image checklist, alt text, selected-pair contrast, readability | Partial: Phase 5 controls and approval gates prepared | Local contrast/decoder tests pass; no automated logo detection or pixel-picker |
| R10 | Recurring confirmed issues, disputed rules, clarification requests | Partial: deduplicated issue table and clarification notes prepared | Local deduplication checks pass; live review history pending; no cut activated |
| R11 | Approved-material handoff and decision trail | Partial: escaped HTML snapshot and fresh approval checks prepared | Local escaping/stale-snapshot tests pass; live download comparison pending |
| R12 | Private content, AI disclosure/off switch and manual recovery | Partial: private access, disclosure, AI-off and manual checklist prepared | Actual private-policy/manual recovery tests pending; fictional data only |
| R13 | Keyboard use, labelled controls and text statuses | Partial: native labelled controls/statuses prepared | Deployed keyboard/unassisted walkthrough pending |

**Changes to state explicitly in the updated PDF:**

- Evaluation changes to ten pilot drafts in Round 2; the promised 24-draft held-out evaluation moves to Round 3. This is testing work, not a fourth product improvement.
- Gemini model IDs are pinned after actual smoke tests.
- Export becomes a readable HTML review record. The original image remains private in the app rather than inside a download package.
- Document import was future scope in the submitted PDF. Round 3 now commits specifically to text-based PDF review and guideline import. **DOCX remains later scope**, rather than adding another parser or claiming it was previously promised for Round 2.
- Pre-provisioned demo access, on-demand expiry, no AI cache, local checks and the reduced test scope are implementation simplifications.

### SampleCo demonstration

The approved trial is 14 days. The draft says **“30 days free with guaranteed 50% savings.”** The app distinguishes a trial-duration conflict from a savings claim without evidence. The creator changes it to **“Try it free for 14 days”**, completes any image checks and submits to a separate reviewer.

The judge approves, downloads the record, then edits content or publishes a changed fact and reloads. Approval is now historical, not current. The checks must also work on the judge's edited text; this is a fixture, not a canned result.

## 3. Minimum implementation

### Stack and data

| Part | Choice and limit |
|---|---|
| App | Next.js and TypeScript; one codebase |
| Data/Auth | Supabase Postgres/Auth with server membership checks and RLS |
| Files | Supabase private Storage; restricted direct upload and temporary viewing |
| Review | Small TypeScript rules; Gemini structured output; Zod and evidence validation |
| UI | Campaign editor/review on one screen, sources form, basic insights table |
| Hosting | Vercel, deployed in Phase 0 |
| Checks | Typecheck, lint, build; three test groups only |

Minimum records: workspaces/memberships, published rulebook snapshots, campaigns/content snapshots, check runs/findings, review events/decisions, and demo-pool leases/call counters. Store clarification requests as typed events. Avoid a general workflow engine.

### Approval with one campaign-row lock

Start the **approve_campaign** database function by selecting the authorised campaign row with **SELECT ... FOR UPDATE**. Keep this row lock until the function's transaction ends, then perform the version/eligibility checks and conditional approval write in that same transaction. Check authenticated reviewer permission, non-ownership, submitted status, unresolved blocking findings, required checklist completion, current content version, current rulebook version and relevant source expiry. Return a clear stale-version or permission error when conditions fail.

Campaign saves and review-state mutations must update or lock that same campaign row in their transactions; merely locking it in approve_campaign would not coordinate writes to unrelated rows. A campaign lock does not lock the separate rulebook: source-version comparisons and stale-on-read behaviour remain required. This is one row-lock convention, not a new concurrency framework. During Phase 4, add one focused two-request smoke check alongside the permission tests to confirm an intervening edit cannot be approved as the older version.

Do not read versions in application code and then perform an unrelated unconditional insert. Store the approved version IDs, check run, reviewer and time. On campaign load and export, use fresh server reads to recompute whether those IDs still match and supporting facts remain valid; do not cache the current approval badge. A change after the approval write makes it historical on the next read. No custom lock orchestration, scheduler or push-update system.

The UI shows when status was checked and refreshes after mutations. A manually seeded already-expired fact verifies expiry behaviour; no controlled-clock suite.

A disputed blocking issue remains unresolved. A reviewer can record a reasoned false-alarm dismissal; unsupported claims need correction, approved evidence or a documented false alarm. Dismissal cannot invent evidence. AI-off/failed runs require an explicit manual-review checklist, labelled in history and export.

### Pre-provisioned demo pool

- Seed isolated fictional workspaces and three real Auth identities per workspace before release. Start with **24 slots**, configurable according to expected judge traffic.
- Start demo claims an unused slot through one database allocation operation, stores an opaque server-managed lease cookie and signs in as its creator. Concurrent claims must receive different slots.
- A clearly labelled demo-only role switch signs in as the reviewer/manager assigned to that lease. Never accept arbitrary account/workspace IDs or change production role permissions.
- Credentials stay server-side. Normal operations still use authenticated user permissions; runtime routes do not create Auth accounts.
- Refresh reuses the same lease. Do not automatically recycle used slots during Round 2 judging, avoiding reset races and old sessions accessing reassigned data.
- Check unused capacity before submission and seed more if needed. Exhaustion shows an honest retry message, never another visitor's workspace.

This is a bounded judge demo, not unlimited public signup. Pool capacity is a release dependency. There is **no on-demand provisioning fallback** in this round.

### Gemini configuration and controls

1. **Models:** The owner-tested candidate is **gemini-3.6-flash**; 3.8 timed out/failed and was explicitly replaced locally. Both configured slots currently use 3.6, without independent redundancy. Phase 6 observed repeated 503 responses, so availability remains an open gate. Record the actual model in every run and repeat affected pilot checks after an explicit model change. No automatic fallback chain. Verify the deployed configuration later.
2. **Free-tier processing, per the owner's latest instruction:** use fictional SampleCo data only. State clearly before an AI check and in the submission PDF that free-tier inputs and responses may be used by Google to improve its products. Do not enter confidential, client or personal information. Keep the manual review path and AI-off option. [Gemini terms](https://ai.google.dev/gemini-api/terms)
3. **Billing:** keep the supplied project on the free tier; this build does not activate billing. If the owner later chooses paid access, configure the project spend cap and budget alerts first. Budget alerts alone do not stop requests, and provider caps may have processing delays. Record any tier change and update the disclosure. [Gemini billing](https://ai.google.dev/gemini-api/docs/billing) · [Cloud budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets)
4. **Visitor limit:** start with **5 attempts per demo lease on the free tier**, shared across its three roles, enforced server-side by an atomic conditional counter increment before the provider call. Failed attempts and explicit retries count. The previously agreed **15 attempts** remain the paid-tier option after sufficient global headroom is confirmed. This is a session limit, not identification of a unique human across browsers; do not raise only the UI limit.
5. **Global protection:** bound inputs/output tokens and configure a global attempt allowance from actual project quota. Keep judging headroom and an AI-off switch. Free-tier availability is a real release risk; show quota exhaustion honestly and preserve manual review without presenting it as a successful AI check.
6. **Execution:** one request with about a 25-second timeout, visible progress and an explicit Retry button. Each retry consumes an attempt. No cache, automatic retry or background job.
7. **Trust:** validate JSON, real quoted spans and rule IDs. Old-run findings remain attached to old versions. Invalid output, quota failure or timeout stays incomplete; it never becomes a clean pass.

This plan does not enable billing. Real provider access and quota are setup dependencies, not already completed actions. The environment tier setting cannot inspect or change Google's actual billing.

### Upload and HTML export

Vercel currently documents a **4.5 MB request/response payload limit** for Functions. Keep the promised 5 MB image limit by uploading directly from the authenticated browser to private Supabase Storage, with server authorisation/finalisation. Check size, bytes/MIME, decoding and a documented dimension cap. [Vercel limits](https://vercel.com/docs/functions/limitations)

Export one **escaped HTML file with no scripts**: approved copy, audience/purpose, alt text, image identifier/link to the authenticated campaign, version/source references, findings, resolutions, reviewer, timestamp and review mode. No ZIP, embedded original image or temporary public image URL. Label that the image remains in the app. Verify approval before export and identify the file as a snapshot at that time.

## 4. Thirty-hour phase schedule

Timeboxes include review, targeted checks, deployed smoke checks and small commits. They are estimates, not measured implementation times. Vaibhav owns all phases and reviews any AI-assisted implementation.

| Phase | Hours | Cumulative | Exit gate |
|---|---:|---:|---|
| 0. Setup and first deployment | 1.5 | 1.5 | Real deployed database, upload and model calls work |
| 1. Foundation and demo pool | 4 | 5.5 | Self-service entry, identities and isolation work |
| 2. Sources and content snapshots | 3 | 8.5 | Published sources/revisions survive reload |
| 3. Exact checks and live AI | 4 | 12.5 | Sourced findings and honest error recovery |
| 4. Human review and approval | 3.5 | 16 | Independent approval and stale-status handling work |
| 5. Image checks, issue table, export | 4 | 20 | Remaining baseline features function |
| 6. Pilot and verification | 3 | 23 | Three groups and ten-draft pilot recorded |
| 7. Submission pack | 3 | 26 | Seven items, links and disclosures verified |
| Repair reserve | 4 | **30** | Defect fixes only; no extra features |

### Phase 0: Setup and first deployment — 1.5 hours

**Build:** establish repository/starter and disclose reuse; configure the supplied Supabase project and free-tier Gemini for fictional data; set conservative limits; pin dependencies. Commit and push the shell to the supplied GitHub repository so the owner can import it into Vercel. Then verify the deployed shell and real services. Confirm the permitted build window applies before implementation.

**Verify:** real authenticated database operation, private upload and structured request with each candidate model from deployment; inspect secret exposure.

**Gate:** primary model and services work from deployment. If account/quota/access setup is blocked, record it and use reserve deliberately. The first commit/push is a setup milestone, not a passed Phase 0 gate. Mock responses do not resolve this dependency.

### Phase 1: Foundation and demo pool — 4 hours

**Build:** minimal tables/migrations, RLS, private bucket, navigation, SampleCo seed and pool. Implement claim/session restoration, restricted role switch and request counters. No signup, invitations or runtime Auth provisioning.

**Verify:** start the permission-test group with real accounts. Check source edits, self-approval, anonymous/cross-workspace access and private files. Claim two distinct slots in fresh browsers, switch roles and reload.

**Gate:** judges enter without help; persistence and isolation work. Fix access before building additional screens.

### Phase 2: Sources and content snapshots — 3 hours

**Build:** simple source form for up to 30 entries with owner/source/dates; publish immutable rulebook snapshot. Create/save campaign text, purpose and audience as numbered versions. Show previous/current text plainly. Define logo/image metadata for Phase 5.

**Verify:** save/reload; invalid metadata/dates; 30/31 rules and 1,500/1,501 words; role restrictions; old snapshots remain readable. Keep current-version checks on saves, with no autosave or live collaboration.

**Gate:** manager and creator use saved records, with clear version labels.

### Phase 3: Exact checks and live AI — 4 hours

**Build:** terminology, supported trial/price and expired-fact checks; one Gemini request for tone/messaging/potential unsupported claims. Add source/span validation, finding cards, suggested edits, disclosure/off switch, limits and failure status. Applying a correction creates a new version.

**Verify:** unit tests for supported rules, innocent substrings, real/invalid quotes and sources, malformed output and safe exported text. Exercise actual Gemini on SampleCo. Manually force a provider failure/timeout in the test deployment and check recovery. Verify call limits server-side.

**Gate:** trial conflict and missing savings evidence are correctly distinguished; live AI works; failures remain incomplete. The model cannot write content or approve it.

### Phase 4: Human review and approval — 3.5 hours

**Build:** comments, disputes, changes requested, submission, false-alarm decisions and the single approve function. Add explicit manual-review checklist. Record actors/history and prevent clients editing old approvals.

**Verify:** extend permission tests for self-approval, wrong role, unresolved findings and stale version IDs. Approve, edit content, reload; publish a changed source, reload; use an already-expired fact. Verify current approval eligibility, without concurrency stress or clock simulation.

**Gate:** real creator-to-reviewer journey works. Previous approval remains historical; automated/manual review mode is visible.

### Phase 5: Image checks, issue table and export — 4 hours

**Build:** direct private upload, image beside approved logo/palette, alt text, logo/spacing/readability checklist, two colour inputs and contrast calculation. Add recurring/disputed-rule table, clarification event/manager note and HTML export.

**Verify:** valid 5 MB upload; oversized/invalid file; missing alt text; known contrast pairs; private-file access. Count confirmed issues once per campaign/rule, even after repeated runs. Open exported HTML and compare its copy, versions, resolutions and review mode. Reject current-approved export after a relevant change.

**Gate:** R09–R11 work. Image/alt-text edits require review. No charts, custom colour sampler, ZIP or PDF exporter. Do not claim that a selected colour pair proves full accessibility.

### Phase 6: Pilot and verification — 3 hours

**Work:** complete the single Playwright journey, run all three groups and the ten-draft pilot below. Check keyboard flow, labels, narrow screens and signed-out entry. Seek one unassisted trial if available; otherwise call it a solo walkthrough.

**Verify:** typecheck/lint/build; fresh seed; live-provider journey; pilot results and all misses. Manually check AI-off, timeout, expired fact, maximum upload and quota recovery. Inspect demo-slot and budget headroom.

**Gate:** no known access-control, data-loss, stale-approval-on-read/export or central-journey defect. Target at least 5/6 planted pilot issues found and no more than 1/4 clean drafts falsely flagged. All supported exact-rule fixtures pass. Invalid citations never appear as valid findings. Use reserve for repairs; report reruns.

### Phase 7: Submission pack — 3 hours

**Prepare:** updated PDF, completed-feature list, implementation details, continuity/change table, three improvements, README/setup/migrations and AI/contribution disclosures. Reuse screenshots from checks. No extra presentation/video project.

**Verify:** inspect every PDF page and link. Open project/repository/PDF as a judge; check deployment protection and access. Match the live deployment to its source revision and run the existing short journey once more.

**Gate:** all seven required items are truthful and accessible. Submit once as team leader under the actual Round 2 form instructions.

### Every phase closes the same way

Review changed code/permissions; run typecheck, lint and build plus relevant tests from the three groups. Exercise new behaviour and one failure in the deployed browser. Repeat the shortest existing journey. Record revision, expected/actual results and open defects in one **BUILD_LOG.md**, then make a small factual commit. No CI pipeline or extra documentation framework.

## 5. Three test groups and the pilot

| Group | Scope | Evidence |
|---|---|---|
| 1. Rule unit tests | Terminology/fact patterns, source/span validators, contrast arithmetic, safe HTML text | Vitest results; no large application-mocking framework |
| 2. Permission tests | Small script using real Supabase users/server operations: unauthorised/cross-workspace access, source edits, self-approval, stale IDs, private files and attempt limits | Actual allowed/denied responses; no DB emulator or broad harness |
| 3. One Playwright journey | Start demo → save → real AI check → revise → independent approval → HTML download → edit/source change and stale status | One repeatable browser test with real persistence/provider access |

Manual smoke checks and the pilot are evidence collection, not additional automated suites. Synthetic invalid outputs are useful for validator unit tests; they must never stand in for the live product integration.

### Ten-draft Round 2 pilot

Seed fictional SampleCo with a 14-day trial, ₹499/month price, official name “SampleCo”, an expired OCT10 offer, respectful-tone guidance and an evidence rule for quantified performance claims. Give each fact a source and appropriate metadata.

| Draft | Input focus | Expected outcome |
|---|---|---|
| P01 | Try SampleCo free for 30 days. | Source conflict: approved trial is 14 days |
| P02 | SampleCo costs ₹299 per month. | Source conflict: approved price is ₹499 |
| P03 | Use OCT10 for 10% off today. | Evidence missing/outdated support: offer expired |
| P04 | Try Sample Corp free for 14 days. | Terminology conflict: approved name is SampleCo |
| P05 | SampleCo guarantees 50% less admin work. | Evidence missing for quantified guarantee |
| P06 | Only an idiot would skip SampleCo. | Style suggestion tied to respectful tone |
| P07 | Try SampleCo free for 14 days. | Clean |
| P08 | SampleCo costs ₹499 per month. | Clean |
| P09 | See whether SampleCo fits your team's needs. | Clean |
| P10 | Explore SampleCo, then decide whether it is right for you. | Clean |

Record expected/actual issue, relevant source/span, model, request time, failures and false alarms. Detection requires the right issue and explanation, not any warning somewhere. Report first results and post-fix reruns separately. These are pilot/development cases, not a statistically validated held-out benchmark.

**Target:** at least 5/6 planted issues detected; at most 1/4 clean drafts falsely flagged. Exact supported-rule cases still need to pass unit tests. A quick manual/app comparison can provide exploratory timing, not a customer-savings claim.

**Round 3:** use 24 fresh held-out drafts, 16 with issues and 8 clean, retaining the Round 1 target of at least 12 issues detected and at most two clean drafts falsely flagged. Freeze labels before evaluation; keep these examples out of prompt tuning and report every miss. This is a disclosed schedule change, not a completed evaluation.

## 6. Feasibility assessment and stop rules

**Estimate assumptions:** provider accounts work, deployment configuration is available, Vaibhav knows the chosen stack, licensed reusable UI primitives are used, and AI-assisted code is reviewed and understood. Billing/provider access can take external time, so it is checked first.

| Checkpoint | Required state | If late or broken |
|---|---|---|
| Hour 5.5 | Deployed isolated demo | Fix access; do not add screens around a broken entry |
| Hour 12.5 | Saved content and genuine sourced checks | Fix integration/validation; no mocked substitute |
| Hour 16 | Independent approval and invalidation | Use reserve for the central journey first |
| Hour 20 | Baseline features present | Freeze features; proceed to verification and submission |
| Hour 23 | Tests/pilot recorded | Preserve submission time; reserve handles specific blockers |

Simplify presentation first: native controls, plain revision text, basic tables and HTML record. If the baseline still overruns, use the agreed cut ladder below. Never silently cut capabilities, permission checks, private storage or honest errors. If reserve and the authorised cuts are insufficient, revise the estimate and disclose unfinished work rather than calling it complete.

### Agreed cut ladder

Apply these in order when an overrun threatens the core journey or the verification/submission time. Record each activated cut, reason and remaining behaviour in BUILD_LOG.md, the completed-feature list and the updated PDF. This order is authorised; no extra permission is needed to activate it when the trigger is met.

| Order | Reduction | Honest status | Behaviour retained |
|---|---|---|---|
| 1 | Defer dedicated clarification requests/manager clarification notes | R10 Partial; clarification subfeature Not built | Normal campaign review comments, disputes and decisions remain |
| 2 | Reduce the recurring/disputed issue table to simple counts | R10 Partial; detailed issue breakdown deferred | Confirmed and disputed totals remain separate; deduplicate by campaign/rule |

Counts must still come from saved findings/decisions; no seeded numbers presented as measured activity. These cuts do not affect ordinary review notes under R07. Do not relabel either deferred baseline feature as one of the three major Round 3 improvements.

Protect the 55-mark core workflow/reliability block: actual AI, saved revisions, private access, source-linked findings, independent approval, stale-approval handling and the HTML record remain intact. There is no authorised next cut to that block. Freeze extras, use repair reserve and report any remaining shortfall explicitly. Read the release definition with activated R10 cuts disclosed as Partial.

**Assessment:** materially smaller and plausible, but still tight for 30 focused solo hours. The remaining risks are Auth/session wiring, real provider access and approval correctness. Early gates expose them. Scope/dependency/arithmetic validation is possible now; actual delivery feasibility is verified during the build.

## 7. Exactly three Round 3 improvements

These extend a complete Round 2 product. Basic image checks, approval invalidation, recurring issues, bug fixes and testing are not relabelled as new improvements.

### Improvement 1: Review text embedded in images

**Value/scope:** extract text from one readable English PNG/JPG, let the creator correct/confirm it, check against approved facts and distinguish image claims from caption claims. Prefer local extraction; disclose any external processing. No video, handwriting guarantee or general logo recognition.

**Sequence:** private image → extraction preview → confirmation → existing checks → versioned result.

**Acceptance:** ten readable fixtures, aiming for the key claim extracted correctly in at least eight; a confirmed 30-day image claim conflicts with the 14-day fact; unreadable input requires manual review, not a silent pass.

**Dependency/effort:** Round 2 images/checks; estimated 4–6 hours, with the extraction spike first.

### Improvement 2: Review short text-based PDFs

**Value/scope:** import campaign PDFs and show findings with page references. Start at five pages, 2 MB and 1,500 extracted words. Preview/confirm text; keep the file private. No scans, password-protected files, DOCX or layout-perfect rewriting.

**Sequence:** at the start of Round 3, spike PDF extraction on the actual Vercel deployment before building either PDF-dependent improvement. Use a known text PDF and verify page text, cold-start/runtime behaviour and the five-page/2 MB limit. Timebox the spike within improvement 2's estimate; if it fails, resolve the extractor/runtime choice before proceeding to improvements 2 or 3. Then private upload → shared extractor → page preview → existing review/approval.

**Acceptance:** fixture text is not lost or duplicated; an issue on page 3 links to page 3; unsupported/over-limit files produce useful errors; original files remain private.

**Dependency/effort:** Round 2 uploads/checks; estimated 4–5 hours. Build extraction as a reusable utility for improvement 3.

### Improvement 3: Import guidelines with manager confirmation

**Value/scope:** reduce manual brand setup. Reuse improvement 2's extraction for a short guidelines PDF with the same limits. Suggest up to ten draft rules/facts with supporting passages/page references. A manager edits/selects candidates, supplies owners/validity metadata and explicitly publishes within the existing 30-entry limit. Imported text is not automatically authoritative.

**Sequence:** shared PDF extractor → candidates and validated passages → manager confirmation → existing publication.

**Acceptance:** use six known guidelines; show supported candidates, reject invented passages, edit one, discard another and publish selected entries. The new version triggers existing approval invalidation. Failed extraction creates no approved rules.

**Dependency/effort:** improvement 2 plus existing rulebook editor; estimated 2–3 hours. One bounded extraction request if AI is used, subject to existing disclosure/quota controls. No batch re-review queue.

**Round 3 allowance:** these additions total approximately 10–14 hours, plus 4–6 hours for the 24-draft evaluation, fixes and final documentation: **14–20 hours estimated**, subject to extraction spikes and actual organiser timing. Run the deployed PDF-extraction spike early because improvements 2 and 3 share it; finish PDF review before guideline import. Test work is not a fourth feature commitment.

## 8. Seven required submission items

| Item | Deliverable | Final check |
|---|---|---|
| Working project link | Stable HTTPS deployment with Start demo and adequate unused pool slots | Complete the flow in a private window |
| Source-code repository link | Judge-accessible source/history, README, env example, migrations/seed instructions, lockfile | Readable and reproducible; no secrets |
| Updated project PDF | Suggested name: DIZZY_DEV_CodeAxis_Round2.pdf | Inspect every page/link; no imposed page count invented |
| Completed-features list | R01–R13 actual status, evidence and limitations | No planned/partial feature labelled complete |
| Technology/implementation details | Actual stack/model, architecture, permissions, tests, pilot and disclosures | Matches the deployed code |
| Changes to original plan | Continuity table, smaller evaluation, HTML export, demo simplification and deferrals | Reasons given; Round 1 history not rewritten |
| Three Round 3 improvements | Section 7's bounded additions | Exactly three meaningful, testable commitments |

Aim for roughly five to six readable PDF pages: problem/users/links; working journey; feature/continuity table; architecture/testing/privacy; improvements/limitations; contributions/disclosures if needed. This is a suggested layout, not an organiser rule. Reuse SampleCo. Follow the actual Round 2 form's delivery instructions.

### AI, reused code and contribution disclosure

- Name **OpenAI Codex** for this planning assistance. If it writes significant implementation, disclose the actual generated/reviewed/tested parts as well. Round 1 disclosed **Claude** for research; preserve that attribution without claiming it wrote Round 2 code unless it does.
- Name **Google Gemini** and the actual model separately as the product integration. Distinguish coding assistance from the product's AI feature.
- List significant libraries, UI components/templates and reused snippets with required licences/attributions. Do not call AI-generated or reused work wholly handwritten.
- Vaibhav reviews and takes responsibility for the work. Rehearse explaining the real data flow, source validation, approve function, permissions, file handling, limits and failure recovery. Resolve any code he cannot yet explain.
- Make small, meaningful commits during the permitted window. Preserve unsquashed history and real timestamps; do not backdate or rewrite it. This is the user's evidence-preservation choice, not a claim that organisers mandate a particular Git workflow.

### Release definition

The deployed core journey, actual AI and private permissions work; baseline features either pass or have an authorised R10 cut explicitly marked Partial; three test groups and ten-draft pilot have recorded outcomes; the PDF explains simplifications and deferred evaluation; all seven submission items are accurate and accessible.

Phase 0 work is now authorised. Consult BUILD_LOG.md for actual code, configuration and verification status; this plan itself does not establish that services, billing, the pilot or deployment have been verified.
