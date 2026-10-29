# CodeAxis Round 3 agent handoff

Prepared 28 October 2026 for continuity into the final round. Read this with the current repository, not as a substitute for inspecting it. Round 3 runs from 00:00 on 28 October to 00:00 on 31 October (Asia/Kolkata), a 72-hour window. The submission cutoff is the start of 31 October; the last working day is 30 October. The organizer says the work must be built inside this event window. Do not falsify commit history, backdate work, or present prior work as a Round 3 addition.

## Mission and product

The project is **Brand Review Desk**, a small brand-governance workflow for marketing teams. A creator saves campaign copy and one image, checks it against a manager-published version of approved brand rules and facts, revises it, and submits it to a separate reviewer. The reviewer resolves findings and can approve only the specific current content, check and source versions. Human approval remains the decision point; the product does not publish campaigns automatically.

The founding example is SampleCo: its approved trial is 14 days, while a draft claims 30 days. Findings should point to a real approved source and quoted text. Use fictional data only. This is a solo project by Vaibhav Tandon (team name DIZZY DEV); the user wants pragmatic, understandable work and truthful evidence. OpenAI Codex has already assisted substantially with planning and code. Preserve and update AI-development disclosure in submission materials, make small authentic commits during the event, and ensure the owner can explain the code. Never claim all code was handwritten.

## Round 3 rules from the organizer

Round 3 is completion of the Round 2 product, not a new product or a direction change. A judge must use the deployed product without a team member explaining it. Finish exactly the three improvements committed in the Round 2 submission. If one is genuinely impossible, explain the reason in the final PDF. Close known loose ends, test empty states, bad inputs, refreshes and repeat actions, improve self-service usability, run the main journeys end to end, and document clone-and-run setup.

Required final submission items:

1. Final working deployed project link (or reliable executable and instructions if deployment fails).
2. Final source-code repository.
3. Final product PDF.
4. Complete list of features built.
5. Technical architecture and implementation summary.
6. Improvements completed after Round 2, including the three committed ones.
7. Testing details.
8. Product roadmap and future development plan.

Rubric: product completeness 25; the three improvements 20; reliability under normal use 20; usability and real-world fit 20; documentation and roadmap 15. There is no social/video requirement. Missing items cannot be sent after the cutoff. The exact form/submission status must be verified with the owner; do not claim a submission was made based on a draft file.

## The three exact Round 2 commitments

These were in `docs/submission/ROUND2_SUBMISSION_FIELDS.md` and the Round 2 PDF. Deliver these exact capabilities or document an unavoidable blocker honestly. Do not quietly replace them with easier features.

1. **Review text inside images.** Extract readable English text from one PNG/JPG, show a correction/confirmation preview, and check confirmed image claims against approved sources. Acceptance target: key-claim extraction correct for at least 8 of 10 readable fixtures; a confirmed 30-day image claim conflicts with the approved 14-day fact; unreadable text asks for manual review. Estimated 4–6 hours in the Round 2 plan.
2. **Review short text PDFs.** Support private text PDFs up to 5 pages, 2 MB and 1,500 extracted words, with preview, page references and the existing review/approval workflow. Start with a deployed Vercel extraction spike. Clearly reject scans, password-protected files and over-limit PDFs; keep originals private. Acceptance: no lost/duplicated fixture text; an issue on page 3 refers to page 3; useful rejection messages. Estimated 4–5 hours including spike.
3. **Import guidelines with manager confirmation.** Reuse PDF extraction to propose up to 10 source-backed rule/fact candidates. The manager edits/selects/rejects them, adds owner/validity metadata and explicitly publishes within the existing 30-entry limit. Acceptance: six known guidelines; reject invented passages; one edited and one discarded candidate; selected publication; existing approval is invalidated after publication. Extraction failure must never publish policy. Estimated 2–3 hours after extraction works.

Round 2 also named a 24-draft evaluation, fixes and documentation as accompanying work, not a fourth improvement. Freeze expected labels before evaluation and report misses honestly. Earlier plans to test 24 drafts in Round 3 are still an evaluation objective, but available Gemini quota may constrain live model calls. Keep the planned evaluation distinct from fixture/unit tests and never fabricate or relabel failed provider cases as successes.

## Round 1 and Round 2 history

- Round 1 was plan-only. The team advanced to Round 2 (the user reported qualification). The original proposal framed one focused workflow: a workspace checks campaign copy and one static image against approved facts, terminology, guidelines and assets; findings cite sources and offer suggestions; humans review; approvals attach to immutable content and source versions. It emphasized privacy, roles, feasibility and no automatic publishing.
- Round 2 asked for a working link, source repository, updated PDF, completed features, technology/implementation, changes from the plan, and exactly three substantial Round 3 improvements. The user provided those requirements. A copy-ready response pack and PDF/DOCX exist under `docs/submission/`. The user has iterated on and edited the Google Form answers in this conversation. **The repo explicitly says its documentation was prepared as a draft and does not assert the form was submitted. Ask/verify actual submission and the exact submitted PDF before changing commitments.**
- Round 2 disclosed deviations: export is one downloadable escaped HTML review record; manual selected foreground/background checks replace the proposed Canvas color sampler; demo access uses pre-provisioned isolated workspaces rather than runtime account creation; the 24-draft evaluation was deferred; PDF/DOCX import was not implemented; provider failures were disclosed. Shared reads, clearer loading/error states and paginated history were added for reliability.
- User then required the README be evergreen: remove team details/email and hackathon dates/timeline, while retaining product workflow, ER/data model, architecture diagrams, local setup and tests. The README was changed to do that. Keep README project-focused; put event-specific evidence in `docs/` submission materials.

### Copy-ready Round 2 form content represented by the repository

The prepared completed-feature answer listed: isolated demo workspaces with separate Creator/Manager/Reviewer identities; versioned publication of guidelines/facts/logos/palettes; private server-validated image upload; saved campaign loading and exact fact conflicts; quoted, source-backed findings and corrections; submission and reviewer decisions; blocker-based approval; manager clarification requests/replies; deduplicated recurring issue counts.

The prepared technical answer describes Next.js, React, TypeScript, Node.js on Vercel; Supabase Auth, Postgres, RLS and private Storage; authenticated server routes; exact TypeScript checks; optional Gemini `gemini-3.6-flash` via REST with Zod-validated structured output, quoted spans and source IDs; Sharp image validation; SQL row-lock approval checking content/source versions, reviewer role, blockers and expiry; Vitest, real-account permission tests and Playwright. It discloses significant OpenAI Codex assistance.

The prepared limitations answer states that switching from Manager back to Creator stalled at “Updating your sign-in…” in the latest public run, so that journey did not complete. Approval and HTML export passed locally, but latest public verification was incomplete; some reloads took seconds. Gemini is unreliable on the free tier with quota/503 errors, has no independent fallback model, and the AI-accuracy pilot was inconclusive. OCR, automatic logo recognition, PDF/DOCX import were absent at Round 2; visual checks require a human; demo data is fictional.

The user later edited that answer: retain these disclosures unless fixed and re-verified. The human-edited version is included in the chat writing-block snapshots dated in this conversation; the exact latest wording is not necessarily stored in the repo. Verify the source state and form receipts before treating it as submitted.

### Latest user-edited form wording captured in this conversation

**The list of features you completed**

- Isolated demo workspaces with separate Creator, Manager and Reviewer identities
- Publishing versioned brand guidelines, approved facts, logos and color palettes
- Private image uploads with server-side validation
- Saved campaign loading and exact fact-conflict checks
- Quoted findings with approved-source references and suggested corrections
- Campaign submission and reviewer decisions on findings
- Blocking approval when unresolved issues remain
- Manager clarification requests and replies
- Deduplicated recurring-issue counts

**Technology and implementation details**

“I used Next.js, React, TypeScript and Node.js, deployed on Vercel. Supabase provides authentication, Postgres, Row Level Security and private image storage. Authenticated server routes connect the interface to stored content, checks and review decisions.

Exact checks run in TypeScript. The optional Gemini integration uses `gemini-3.6-flash` through REST, with Zod validating structured output, quoted text and source IDs. Sharp validates uploaded images.

The hardest part was preventing stale approvals: the database approval function locks the campaign row and checks content/source versions, reviewer identity, blockers and expiry. Vitest, real-account permission tests and Playwright provide verification. OpenAI Codex assisted development.”

**What changed from the original proposal, and why?**

“I retained the text-and-image review workflow but simplified implementation for a solo build. Export became one HTML review record instead of a packaged download. Selected text/background colours and manual visual checks replaced the proposed Canvas colour sampler. Pre-provisioned demo accounts replaced runtime account creation.

The 24-draft evaluation moved to Round 3. Round 2 used a smaller pilot, with provider failures reported openly. I also added shared data loading and paginated history to reduce repeated requests while preserving older records.”

**What does NOT work yet?**

“Role switching can stall at ‘Updating your sign-in…’. This occurred when switching from Manager back to Creator during the latest public test and blocked completion of that journey.

Successful approval and HTML export passed locally, but their latest public verification remains incomplete. Some reloads also take several seconds.

Gemini checks remain unreliable under free-tier quota limits and provider 503 errors. There is no independent fallback model, and the AI accuracy evaluation remains inconclusive.

Image OCR, automatic logo recognition and PDF/DOCX import are not implemented. Visual checks still require human review. The demo is restricted to fictional data.”

Treat this as the latest wording captured in chat, not independent proof of submission or current deployed status. Update it based on fresh evidence in the final Round 3 form.

## Current code/product baseline

Canonical project path is this repository. Public links from Round 2 materials:

- Deployed app: https://brand-review-desk.vercel.app/
- Source repository: https://github.com/Tvaibhav06/code-axis

The app is one Next.js App Router codebase. Browser/UI → server routes and access checks → Supabase Auth/DB/RLS/private Storage; exact rule checks run in TypeScript; optional Gemini runs server-side; Sharp validates image bytes and metadata; SQL functions enforce trusted writes and approval; export produces a single escaped HTML record. Roles: Creator saves/checks/submits, Manager publishes sources/assets and responds to clarifications, Reviewer independently resolves and approves. Approval binds a specific campaign revision, rulebook version and check run, and becomes historical when content or sources change or support expires.

Main capabilities implemented by Round 2 include isolated pre-provisioned demo identities, source snapshots, numbered copy versions, exact terminology/fact checks, source-backed optional AI findings, comments/decisions/clarifications, independent approval, stale-approval invalidation, private PNG/JPG upload and manual checks, selected-pair contrast, issue counts, paged history and HTML export. Check actual code before extending; these are documented features, not a fresh assertion that every public route currently works.

Core limits documented: maximum 30 source entries, 1,500 English words, one private PNG/JPG up to 5 MiB, image-side/pixel caps enforced in code, Gemini 5 tries per demo session and cumulative app cap 22. The Gemini free-tier provider quota is separate and had already returned 503/quota failures. Do not call provider or consume demo workspaces casually; inspect configuration/evidence before any live run. No billing should be enabled without explicit user authorization. No API keys/passwords/service-role keys/private manifests in chat, docs, commits, screenshots or public client code.

## Verified evidence and open risks at Round 2

The docs report that 51 unit tests, real Supabase permission checks, lint, type generation/TypeScript and optimized build passed at a local release checkpoint. The local manual/image Playwright journey passed, including history paging, approval, actual HTML download and invalidation; a separate one-call live-AI path passed once. These checks were local and tied to specific recorded revisions. Inspect raw reports and latest git state before repeating or describing them.

The frozen ten-case Gemini pilot did not pass: first run produced 4 completed AI responses out of 10, six 503s; a later run stopped on quota after five attempted cases with zero completed AI responses in that rerun. Combined exact/AI findings caught 4/6 planted issues overall with small evaluable subsets; results do not establish the planned accuracy target. One later provider call does not erase the failed pilot. Application cap was set to 22, an owner-authorized 10 more attempts were permitted; the repo records 17 provider calls (5 completed, 11 HTTP 503, one quota error) plus one diagnostic-only reservation and no more calls after quota failure. Recheck actual current counts before any live AI use.

Public deployment was not fully verified at the Round 2 cutoff in stored notes. `docs/evidence/public-form-check-2026-10-25.json` says the run reached exact checks, submit, reviewer blocker behavior, issue counts and clarification, then stalled switching Manager→Creator for 35 seconds. This is a release-blocking usability/reliability issue to diagnose and verify against the deployed revision. Do not claim the whole public flow passed until a fresh independent-browser journey does.

## Repository instructions and present working-tree state

Before editing, inspect:

1. `AGENTS.md` (it notes this Next.js version differs from older conventions; read relevant installed docs in `node_modules/next/dist/docs/` before code changes).
2. `README.md` (evergreen workflow/architecture/setup, five Mermaid diagrams; personal team info and event timeline intentionally absent).
3. `BUILD_LOG.md` (historical phases and evidence; later entries supersede older state).
4. `docs/ROUND2_SUBMISSION.md`, `docs/submission/ROUND2_SUBMISSION_FIELDS.md`, `docs/submission/ROUND2_OWNER_CHECKLIST.md`.
5. `docs/PHASE6_VERIFICATION.md`, `docs/PERFORMANCE_FIXES_AND_WORKFLOW.md`, `docs/LOCAL_RUN_AND_MANUAL_VERIFICATION.md`, `docs/SETUP_REMAINING.md`, plus raw evidence JSONs they cite.
6. `package.json`, `src/`, `supabase/migrations/`, `tests/`, `scripts/`, Vercel config and git history/status.

At the handoff creation checkpoint, git status showed pre-existing work: modified `BUILD_LOG.md`, `docs/LOCAL_PERFORMANCE_AUDIT_2026-10-24.md`, `docs/ROUND2_SUBMISSION.md`; untracked public-check evidence and submission DOCX/PDF/checklist/fields. The README was not shown as modified at this checkpoint. Preserve this work. Do not reset, clean, overwrite, stage or commit unrelated changes. Inspect `git status` again because it may have changed since this document was written. No secrets should be read into output.

## Working approach for the next agent

1. Start with a factual repo/status/deployment audit. Confirm branch, HEAD, dirty files, exact deployed revision, whether Round 2 materials were submitted, remaining 72-hour time, live services and existing demo capacity. Do not infer a greenlight from old evidence.
2. Read the exact Round 2 PDF and submission fields, compare all three promises against code. Review the Round 3 form/rules supplied by the owner and, if needed, the official event site. Preserve the exact three commitments.
3. Take a short feasibility spike for **PDF extraction on Vercel first**, as committed. Confirm runtime compatibility, memory/time/file limits, safe extraction and page-number mapping on the actual deployment path. If a capability fails, report the evidence and the smallest compliant alternative; do not silently drop it.
4. Plan changes by dependencies: establish shared safe PDF ingestion; implement private text-PDF review with page-aware findings; reuse extraction for manager-reviewed guideline candidates; separately implement image OCR with explicit human confirmation before claim checking. Ensure OCR/PDF text enters the existing versioned review/check/approval path instead of creating a parallel unchecked workflow.
5. Keep privacy and trust boundaries: private originals, file signature/type/size/page/word limits, scanned/password/hostile input rejection, no client-supplied trusted source IDs or validated metadata, output validation, clear failure states, no silent policy publication. Reuse existing RLS/roles and SQL versioning.
6. Do not trade away the main journey for scope. Order work against the rubric and dependencies; define observable acceptance checks for each commitment, then actual browser journeys for creator image/text, creator PDF, manager import/confirm/publish, reviewer approval invalidation, plus refresh/retry/empty/invalid/double-submit cases.
7. Use existing test groups and add focused meaningful tests for new boundaries; do not fabricate provider results. Run appropriate local checks and at least a fresh deployed browser test if deployment is available. Save sanitized raw evidence and dates/revisions. Disclose unverified/partial work exactly.
8. Update the final PDF, completed feature list, architecture/implementation, post-Round-2 changes, testing, roadmap and setup docs to match the shipped revision. Keep the README evergreen without team details/email/timeline. Verify PDF render/layout and every link. Confirm repo clone setup works.
9. Make small commits during the event window with real timestamps; push only when authorized/needed for the deployed submission, then verify Vercel used that commit and the link works in a fresh session. Do not claim push implies successful deployment.

Do not promise a win or optimize by misrepresenting performance. The goal is the strongest truthful product that satisfies the rubric and can be explained by its owner.

## Prompt for a continuation agent

> You are continuing CodeAxis Round 3 implementation for Brand Review Desk. First read `docs/ROUND3_AGENT_HANDOFF.md`, then inspect the current repository, `AGENTS.md`, git status/history, Round 2 PDF and copy-ready form fields, `BUILD_LOG.md`, verification docs/raw evidence, package scripts, code, migrations and relevant Next.js 16 docs. Treat the current checkout and actual submitted Round 2 PDF as source of truth; preserve all pre-existing changes and secrets. Do not reset/clean the repo or claim draft materials were submitted. The Round 3 window is 00:00 28 Oct through 00:00 31 Oct 2026 Asia/Kolkata, and new work must honestly originate inside that window.
>
> Deliver exactly the three Round 2 commitments: (1) English OCR of one PNG/JPG with a human correction/confirmation preview and source-backed checks of confirmed image claims; target at least 8/10 readable fixtures, with unreadable images sent to manual review; (2) private text PDFs capped at 5 pages, 2 MB and 1,500 extracted words, with preview, correct page references and existing review/approval path, useful rejection of scans/password/over-limit files; first perform a deployed Vercel extraction spike; (3) manager-confirmed guideline import reusing PDF extraction, proposing up to 10 source-backed candidates that the manager can edit/select/reject, add owner/validity data to and explicitly publish within the 30-entry limit; test six known guidelines, invented-text rejection, edit/discard, publication and approval invalidation. Extraction failure must never publish policy. Also perform the planned 24-draft evaluation only if available quota permits; preserve all failures and never invent results. Do not replace or silently cut a commitment.
>
> The main risk already recorded is the public Manager→Creator switch stalling at “Updating your sign-in…”; reproduce against the current deployment and fix/verify before final submission. Gemini free quota previously produced repeated 503s and quota errors; do not spend calls without checking remaining allowance and stop on quota failure. Keep demo data fictional. No secrets in logs, docs, commits or client code. Keep the evergreen README free of team identity, email and event timeline.
>
> Work carefully and in dependency order, starting with the Vercel PDF extraction spike. Before each major implementation area, state a concise plan and acceptance gate; then implement, test and record evidence. Preserve RLS, role checks, private storage, immutable versions and approval invalidation. Ensure extracted text and OCR claims flow through current trusted server-side checks; human approval remains mandatory. Add useful error, empty, refresh, repeated-action and invalid-input handling. Run focused meaningful tests plus the existing rule, permission and Playwright journeys as appropriate. Verify with `npm.cmd run check` and real browser evidence where feasible. Keep estimates/release statements evidence-based. Commit in small event-window commits with understandable messages, but don't push or deploy unless owner authorization/workflow permits; if deployed, verify the exact source revision and judge-accessible journey. At finish, update the final product PDF and all Round 3 submission fields: working link, repo, final PDF, features, architecture, changes, exactly-three improvement delivery status, testing and roadmap. Include concise status, test results, limitations, files changed and next owner actions.
>
> The user wants a strong Round 3 result, but organizer rules and truthfulness take priority over “at any cost.” Do not claim win, passing tests, completion, or submission without evidence. Ask only for genuinely blocking missing information and continue independent work meanwhile.
