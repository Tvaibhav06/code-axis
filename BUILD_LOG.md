# Build log

## Phase 0 — started 23 October 2026 (Asia/Kolkata)

**Status: Service setup is underway. The owner supplied passing Supabase smoke and Gemini 3.6 connectivity reports. Most live permission checks passed; stale-version conflict responses need migration 007 and a rerun. Phases 1–5 remain short of full runtime acceptance.** No phase is marked complete without its exit evidence. Remaining service steps are in docs/SETUP_REMAINING.md.

### Authorised plan changes

- Cut clarification features first, then reduce issue breakdowns to deduplicated counts; mark R10 Partial if activated. No cut is currently activated.
- Campaign-row lock at the start of approve_campaign, with coordinating saves/review mutations. Approval code belongs to Phase 4.
- Latest owner instruction: free-tier Gemini and fictional data only. Use 5 attempts per demo lease for now, with 15 retained as the paid-tier option. Enforcement belongs to Phase 1/3; global allowance must reflect actual quota.
- Early deployed PDF-extraction spike in Round 3, shared by improvements 2 and 3.

### Work prepared

- Local Next.js/TypeScript app shell and clearly labelled SampleCo example.
- Pinned production dependencies, environment example and deployment configuration.
- Protected real-service verification route and local/deployed smoke commands.
- Owner-isolated Supabase smoke migration and cleanup-aware database/storage checks.
- Real primary/fallback model checks using a fixed fictional fixture; no paid billing activation. Paid configuration, if later chosen, requires explicit settings.
- README with setup, limitations and significant AI-assistance disclosure.

### Evidence and unresolved dependencies

- System Node 22.16.0 and npm 10.9.2 detected.
- Dependencies installed and locked; `npm ls --depth=0` passed. Network interruptions left an incomplete local compiler. A fresh copy of the exact pinned compiler package was installed in an isolated cache and verified by successful route-type generation and a production build. The original bytes were backed up, then the installed binary was repaired and hash-matched to that working copy.
- ESLint 9.39.5 is pinned because the import plugin bundled with the current Next configuration declares support through ESLint 9. npm reports the ESLint 9 line as unsupported; this is a development-tool maintenance item, not a suppressed peer-dependency error. Revisit when the plugin supports ESLint 10.
- The owner supplied Supabase project `https://uyowubvbofkahdoovfxb.supabase.co` and GitHub repository `https://github.com/Tvaibhav06/code-axis`, authorised the first commit/push, and will import the repository into Vercel. Remote inspection found no existing refs.
- The owner subsequently supplied service settings through ignored `.env.local`; values have not been printed or staged. The smoke-user login is currently rejected by Supabase. The server-only allocation/seed key and pool manifest were still missing at the last configuration-presence check.
- The owner pushed commit 59ed3d1 and deployed `https://brand-review-desk.vercel.app`. Public HTTP checks below now establish shell availability; they do not establish a working review product.

Do not infer provider access, paid billing, RLS correctness or a deployed link from a successful local build. Record actual checks below before passing the phase gate.

### Verification record

- Lint: passed after correcting internal navigation to use Next.js Link.
- Route generation and TypeScript: passed with the clean compiler copy.
- Production build: passed with the clean compiler copy; generated the home page, not-found page, health route and protected setup route.
- Service smoke runner: ran and exited nonzero with all five checks **blocked**, correctly identifying missing Supabase key/test-user credentials and Gemini API key. No provider call or live database/storage result is claimed.
- The lockfile includes Linux and Windows compiler variants for the Vercel/local environments.
- Standard `npm run check` after compiler repair: **passed**, with no compiler override. Lint, route-type generation, TypeScript and the production build all completed successfully.
- Production server: reported ready on port 3000. Browser navigation timed out. Direct local HTTP requests were blocked with EACCES, then ETIMEDOUT after a network permission grant. Browser appearance, runtime HTTP responses and deployed behaviour are therefore **not verified** in this environment.
- Secret handling: `.env.local` is ignored. The local setup token remains in that file; public configuration and blank placeholders are the only settings intended for Git.
- The first commit is the shell/import milestone. It does not certify working external integrations or complete the Round 2 product. The owner can import the repository into Vercel, add service settings there, and then run the documented deployed checks.

## Continuation — 23 October 2026

### Current phase status

| Phase | Actual status | Exit gate |
|---|---|---|
| 0. Setup/deployment | Partial: public shell works, one real model fixture passed | Supabase/Auth, database/storage, primary model and deployed diagnostic remain unresolved |
| 1. Foundation/demo pool | Prepared in code; static checks pass | Migrations, seeded identities, real permission checks and browser isolation remain pending |
| 2. Sources/content snapshots | Prepared in code; 19 input-boundary unit checks pass | Real persistence, role checks and deployed editor remain pending |
| 3. Checks and real AI | Prepared; 27 local unit checks and production build pass | Live persistence, quota and provider journey pending |
| 4. Human review/approval | Prepared; local checks pass | Live permission and transaction tests pending |
| 5. Images/export | Prepared; 47 local unit checks pass | Deployed upload/export and permission gates require setup |
| 6. Pilot/verification | Partial: manual text/image browser journeys pass; pilot and live-AI journey failed | Repeated provider 503; remaining gates in docs/PHASE6_VERIFICATION.md |
| 7. Submission pack | Not started | Await measured implementation results |

### Observed live checks

- Public home page: HTTP 200, with Brand Review Desk, labelled fictional example and free-tier disclosure.
- Public `/api/health`: HTTP 200, explicitly scoped to the application shell.
- Unauthenticated `/api/setup/verify`: HTTP 401, as expected.
- Operator deployed smoke check with the local token: HTTP 401. The Vercel token is absent or does not match; no service success is inferred.
- Local Supabase sign-in: HTTP 400, `invalid_credentials`. Database/private-storage checks remain blocked behind authentication. The configured credentials must identify a real dedicated Auth user in the supplied project.
- Real `gemini-3.6-flash` structured fixture: **passed** with fictional SampleCo (14 approved days versus 30 claimed days).
- Real `gemini-3.8-flash`: first call HTTP 503; one explicit primary-only recheck timed out at 25 seconds. No automatic retries or switch were added. Keep the primary availability blocker visible; 3.6 is the only successfully tested candidate so far. These are connectivity fixtures, not accuracy/pilot evidence.

### Phase 1 work prepared within the existing plan

- Workspace/member RLS, three distinct roles and a private 5 MB PNG/JPG bucket. No client asset overwrite/deletion.
- Server-only atomic pool allocation, lease restoration, exhaustion handling and an eight-hour opaque lease. No automatic recycling or runtime account provisioning.
- Standard Supabase SSR session renewal, same-origin demo mutations and lease-bound role switching. Normal workspace reads use the authenticated user, not the admin key.
- Local pre-seed script for 24 judge slots plus two verification-only workspaces. Credentials are generated into `.env.local` only; interrupted setup can resume without resetting used slots. The script has not been run successfully against the project yet.
- Conditional session/global attempt counters in SQL, with five free-tier attempts and a zero global allowance until actual quota is configured. No public AI route exists yet; enforcement execution remains unverified.
- Phase 1 permission-test script using real accounts/storage. Missing pool setup returns blocked/failure, never a fabricated pass.
- Minimal workspace navigation and demo role controls, hidden behind `DEMO_ACCESS_ENABLED=false` until setup passes. No Phase 2 editor was added around broken access.
- Narrow smoke-check scopes and safe Auth error guidance to diagnose setup without logging passwords or provider bodies.

### Local verification and remaining work

- `npm run check`: passed for the foundation, seed and initial permission-test code (lint, route generation, TypeScript, production build).
- Build includes `/desk`, `/api/demo/[action]`, existing diagnostic/health routes and the SSR proxy.
- Focused lint/typecheck rerun after permission-script cleanup edits: passed. Migration runtime, real permission results, fresh-browser allocation and deployed foundation are still pending.
- No authorised cut has been activated. Campaign checks, approvals and export have not been labelled complete or simulated.
- The owner explicitly chose **continue code preparation; setup later** after the Auth/token blockers were reported. Preparation may continue in plan order; no runtime exit gate is waived or marked passed. No further repeated provider calls are planned while setup is deferred.

## Phase 2 code preparation — 23 October 2026

- Manager source form with up to 30 entries, owners/references, validity dates and terminology aliases; immutable publications and readable history.
- Creator campaign form with purpose/audience, the 1,500-word boundary, explicit numbered saves and plain previous-version text. Reviewer/manager read access is retained; the API/database reject creator-only edits from other roles.
- Database expected-version checks for source publication and campaign saves. Saved revisions have no direct client update/delete privileges. Saves coordinate on the campaign row reserved for Phase 4 approval.
- RLS and role validation in both application and database functions. APIs derive the workspace/user from the lease; caller-supplied scope is rejected.
- SampleCo setup script uses real manager/creator sessions, preserving the qualified 14-versus-30-day example, ₹499 fact, expired OCT10, respectful tone and evidence requirement.
- The same permission-test group now includes publication/revision preservation, stale edits, source/word boundaries and cross-workspace denial. `--foundation-only` preserves the Phase 1 check scope. Real execution remains blocked by missing seed/migration setup; no database emulator was introduced.
- Vitest unit group: **19 tests passed** for source/word boundaries, duplicate identities, required metadata, invalid dates/numbers, rejected caller scope and missing current snapshots. This is input validation evidence, not live AI accuracy or the ten-draft pilot.
- Final Phase 2 checks: **19/19 unit tests passed**, followed by successful lint, route generation, TypeScript and production build after the last error-state edits. Browser/database runtime gates remain unverified.
- Still no implemented product AI checks, human approval, image-review workflow, issue insights or export. Those remain in Phases 3–5. No Round 3 feature has been added.

## Phase 3 code preparation — 23 October 2026

- Exact name, trial-day, INR monthly-price and relevant source-validity checks; three labelled finding categories with exact quotes and source references.
- Real server-side Gemini request with a 25-second bound, explicit primary/fallback selection, structured output plus real-source/exact-quote validation. No mocked product AI, retry or result cache.
- Server-only recording prevents a browser from inventing a successful AI run. Session/global allowance is reserved before a provider call; failure keeps exact results and requires manual review.
- Saved check history and creator-confirmed literal replacement into a new version. Review refers to saved copy, not unsaved form text.
- Local verification: **27/27 unit tests**, lint, TypeScript and production build passed. The first test run exposed a misnamed fixture import, corrected before this result.
- Migration 004 and the product AI journey have not run on Supabase. No live permissions, accuracy or deployed-workflow pass is claimed. Phase 0/1 setup remains deferred by the owner.

## Phase 4 code preparation — 23 October 2026

- Append-only comments, confirmation/dispute/dismissal decisions, change requests and independent human approvals. Dismissals require a reason; confirmed/disputed blocking issues remain unresolved until corrected or dismissed.
- `approve_campaign` locks the authorised campaign row at its start, then verifies the submitted version, latest check, current sources, source validity, blocking issues and reviewer checklist in one transaction. Source publication is coordinated with a workspace share lock.
- AI-off/failed runs require an explicit manual facts/claims/tone review. An AI-assisted approval is never generated by the model.
- Approval status is recomputed from saved versions and source dates on each read. Editing or re-checking makes earlier approval historical.
- Extended the existing permission group with real role denial, manual checklist, blocker, source-change and one two-request edit-versus-approval test. Trusted manual test fixtures are labelled and are not model-quality evidence.
- Local unit tests **27/27**, lint, TypeScript and production build passed; lint/typecheck also passed after adding the permission script. The live script has not passed because service setup is deferred. SQL transaction/RLS behaviour still needs real Supabase verification.

## Phase 5 code preparation — 23 October 2026

- Authenticated direct upload to the private bucket, with server ownership checks and trusted registration only after size, signature/MIME, dimensions and full Sharp decoding pass. Still PNG/JPG only; 5 MB, 4096 pixels per side, 16 megapixels. Original bytes stay unchanged; temporary signed previews last five minutes.
- Manager logo/palette publication and campaign image/alt-text/checklist/colour metadata are stored in new immutable versions. Creator-confirmed text suggestions preserve attached image metadata. Read-only reviewers can compare the saved image with the approved logo/palette.
- Manual logo, spacing, readability and palette checks plus a selected-pair contrast calculation. SQL approval independently requires these fields, alternative text and at least 4.5:1 for the selected normal-text pair. These are not automated logo recognition or a full accessibility assessment.
- Confirmed/disputed issue table uses the latest decision per finding and counts each campaign/rule once per column across repeated runs. Dismissing one false alarm does not hide a different confirmed issue. Clarification requests and manager notes use the existing append-only review trail. No cut-ladder item was activated.
- One escaped HTML snapshot includes approved copy, purpose/audience, private image identifier, sources, findings/resolutions, reviewer/time/mode and decision history. It contains no scripts, embedded original image or temporary signed URL. Fresh approval is checked before assembly and immediately before response.
- Added real-account image permission assertions to the existing permission group, including forged-validation denial, missing alt/manual checks, contrast and preservation of old metadata. These fixtures are labelled manual, not fabricated AI results.
- **47/47 local unit tests passed**: input/exact-check/AI-evidence boundaries, actual PNG/JPEG decoding, MIME/corruption/dimension/5 MB boundaries, declared-animation rejection, contrast, issue deduplication, HTML escaping and rejected stale snapshots/unsafe links.
- All six migrations and their PL/pgSQL bodies passed a local PostgreSQL syntax parser. This is syntax evidence only: schema creation, grants, RLS, source expiry and transaction behaviour remain unverified in Supabase.
- The live permission command was attempted and returned blocked/failure because the server key and generated verification manifest are missing. Presence-only checks confirmed both missing, the local smoke token present, and interactive entry still false. No private settings were printed.
- Windows build friction: Turbopack could not create the native Sharp junction. Switched to Next's supported Webpack builder. The old cache could not be cleared because automatic approval review rejected that action; no cache deletion occurred. A build passed in a separate output folder. Subsequent Windows worker-directory creation errors were handled with ordinary authorised directory creation, without copying/removing files or changing permissions. The optional BRD_BUILD_DIR setting and ignored output folders keep this local workaround out of the deployed configuration.
- Phase 6 browser journey/pilot and Phase 7 submission pack remain unstarted. Provider calls have not been repeated while service setup is deferred. No deployed end-to-end or accuracy result is inferred from compilation.
- Final Phase 5 verification: **47/47 unit tests, lint, route generation, TypeScript and production build passed** after the last UI/error-state edits, using `.next-phase5-final` locally. Next's generated temporary output-path additions were removed from the tracked compiler settings afterwards; compiler options are unchanged.
- Eight local HTTP checks against that production build passed: landing/health 200; review/upload mutations reject a foreign origin with 403; disabled review, image, issue-history and export services return controlled 503 responses. These are shell/gating checks, not signed-in permission or browser-journey evidence.

## Live setup and stale-version repair — 24 October 2026 (Asia/Kolkata)

- Owner reports migrations 001–006 created the expected tables, seeding succeeded, and Supabase Auth/database/private-storage smoke checks passed. The owner also supplied a fresh passing Gemini 3.6 fixture (about four seconds) and a timed-out 3.8 primary fixture (25 seconds).
- The owner's real permission report passed every listed assertion except the two exact stale-version error-code expectations. Role isolation, immutability, independent approval, blocking findings, invalidation, the edit/approve race and image approval gates passed in that report. This is user-supplied runtime evidence, not a fresh full-suite pass by the agent.
- A focused agent diagnostic using only verification identities reproduced both stale operations returning transport status 0 with an empty error code. Subsequent reads confirmed that source/campaign versions were unchanged. No judge slot, Gemini quota or API credentials were exposed. The diagnostic did not identify which transport component timed out.
- The old SQL uses serialization SQLSTATE 40001 for expected user version conflicts, which PostgREST maps to HTTP 500. Migration 007 replaces only those raises in the four existing source/save/review/approve functions with PT409 (explicit HTTP 409). All role checks, row locks, conditional updates and grants remain. Already-applied migrations are preserved; apply only 007 to an existing 001–006 installation.
- Server error handling accepts explicit PT409 and legacy 40001 during migration. Permission tests now require both PT409 and HTTP 409, separately verify unchanged saved versions/history, and print only sanitised status/code/timeout diagnostics on failure. Timeout/network errors are not accepted as a pass.
- Local primary model explicitly changed to the owner-tested 3.6 candidate in ignored `.env.local`; both slots currently point to this one model, without claiming independent redundancy. No Gemini call was made during this diagnostic turn.
- **49/49 rule-unit tests passed** including strict conflict classification; migration 007 SQL and PL/pgSQL syntax parsing passed. Applying 007, rerunning real permission checks, updating Vercel settings/deployment and Phase 6 acceptance remain pending.
- Lint and TypeScript passed for the repair. The production build rerun hit the restricted Windows environment's EPERM folder-creation error at `.next-conflict-verify/server/app/api/export`; no new successful production-build result is claimed for this repair. Verify `npm run check` in normal PowerShell. The four function bodies after the scoped error-code replacement also passed SQL/PL/pgSQL syntax parsing. The 69-file staged-index secret scan passed; `.env.local` remains ignored.

## Phase 6 local work — 24 October 2026 (Asia/Kolkata)

- Owner subsequently supplied passing migration-007 permission checks, primary connectivity, all 49 unit tests and a successful production build from normal PowerShell. The owner enabled local demo access and explicitly deferred Vercel deployment until local work is finished.
- Installed pinned Playwright 1.64.1; added one repeatable Chromium journey with explicit AI/manual modes and optional image steps. No automatic test retries, network-response mocks, stored auth-state files, CI or extra automated suite.
- Manual text and image journeys passed, including real identities, direct private upload/finalisation, published logo/palette, copy revision, independent human approval, actual HTML download, edit invalidation and HTTP 409 on stale export. A 390 px viewport and keyboard skip-link entry passed. These are solo automated runs, not unassisted user evidence.
- Initial test-address rejection was resolved by using localhost, matching Next's normalised local origin; the app's origin check was not relaxed. A cancelled download passed using workspace-owned temporary/download directories. An accidental extra manual test launch after a shell-quoting error was interrupted. Failures/reruns are disclosed in the verification report.
- Added an actual expired-source approval denial assertion to the existing permission group and reran it against real verification accounts: **zero failures**. Rule tests remain **49/49**; lint and TypeScript passed after authoring the test/runner. No product runtime source was modified in this phase.
- With owner authorisation to work within the free tier, set the database/local cumulative app allowance to 12 with per-lease limit 5, preserving consumed attempts. This is a conservative cap, not a verified Google project quota. No billing changes or automatic quota increases were made.
- Ten fixed pilot cases each made one real model request, at least 65 seconds apart. Four completed and six returned HTTP 503. The combined pipeline caught 4/6 planted issues (including exact findings on failed AI runs); only 2/6 planted cases had completed AI responses. Zero false alarms occurred among the 2 clean cases that completed AI; the other 2 clean cases are unknown. **The pilot target was not met.** Raw first-run results are retained unchanged under docs/evidence.
- The separate real-AI image/browser attempt also failed at its first real check with recorded provider_http_503. Total Phase 6 provider calls: 11, comprising 4 complete and 7 HTTP 503. The twelfth allowance unit was left unused. Manual-path passes do not count as a live-AI journey pass.
- Snapshot after testing: 17 unused judge slots, 7 claimed, with no recycling. Verification slots remain separate. Phase 6 stays partial; see docs/PHASE6_VERIFICATION.md for session/global exhaustion, timeout, maximum browser upload and deployment checks still unverified. Phase 7 and deployment were not performed.

## Phase 6 later retry and recovery — 24 October 2026 (Asia/Kolkata)

- Owner requested another attempt. Used the one remaining app attempt without increasing/resetting the cumulative 12-attempt cap, changing billing or switching models. The revised copy's real `gemini-3.6-flash` result completed. Across all Phase 6 provider requests so far: 12 attempts, 5 complete and 7 HTTP 503. Original pilot failures remain unchanged.
- The single Chromium journey now supports an explicitly labelled one-live-call variation: first exact check, revise, real AI on the revised version, separate reviewer approval, actual escaped HTML download, edit invalidation and HTTP 409 stale export after reload. This variation passed in 2.2 minutes. It does not claim two real-AI checks or a conclusive pilot.
- In that journey a decodable PNG plus inert trailing padding of exactly 5,242,880 bytes uploaded directly to private storage and passed full server decoding/registration with the same byte count. One additional byte was rejected by the UI. This is a maximum file-size boundary fixture, not a large-dimension benchmark. Logo, palette, alt text and manual image checks also ran. Saved screenshots were visually inspected.
- A separate fresh-session variation exercised shared-allowance rejection with session attempts still available. Failed AI result/error and exact findings remained visible; remaining session attempts did not change. AI-off revision, manual reviewer checklist, approval, actual HTML download and invalidation all passed in 1.1 minutes. The rejected request made no provider call. Session-only exhaustion and a product timeout remain separate open checks.
- Capacity after these runs: 15 unused judge slots, 9 claimed. No recycling. The README/setup checklist now distinguishes completed local setup from open evaluation and release work.
- Visual review found the immediate reload screenshot captured background-loading placeholders. Strengthened the existing journey to wait for loaded checks, approval and issue counts. Repeated the shared-allowance/manual variation: passed in 1.7 minutes with no provider call; loaded-state screenshot confirms historical approval. Original captures were retained and labelled. Latest capacity: 14 unused judge slots, 10 claimed. Lint and TypeScript passed after the final test edit; no production runtime code changed.
- Phase 6 remains partial pending a conclusive pilot and the remaining failure checks. Additional pilot allowance was requested separately; it was not assumed. No deployment, push or Phase 7 completion was performed.

## Authorised additional allowance and partial pilot — 24 October 2026

- Owner explicitly approved ten additional test attempts. Changed the cumulative local/database cap from 12 to 22 while preserving consumption, normal five-attempt sessions and free billing. No automatic model switch or retry.
- Repeated the fixed pilot with at least 65 seconds between requests. P01–P04 returned HTTP 503 with their exact conflicts retained. P05 returned a provider quota error. The runner stopped immediately; P06–P10 were not run. Zero AI responses completed among five attempted cases, and no clean case was evaluated. This rerun does not meet the pilot gate. Both raw reports are retained separately.
- A temporary optional session-recovery branch was prepared and typechecked but not reached because of the quota stop; it was removed. No unexecuted branch is credited as tested. The pilot runner's tracked implementation is unchanged from the preceding commit.
- Manually exercised the service-only reservation RPC using one verification-only lease at a controlled one-attempt limit: one accepted reservation, three specific session-limit rejections, counter unchanged after denial, normal five-attempt setting restored in `finally`. No provider was contacted. This tests the parameterised SQL guard, not a five-call browser flow; manual UI recovery already passed separately. No new test suite, runtime account allocation or counter reset was added.
- Totals across Phase 6: 17 provider calls (5 complete, 11 HTTP 503, 1 quota error), plus one diagnostic-only reservation. App consumption is 18/22, with four app units left; provider quota availability is not inferred from app headroom. No further provider call was made after the quota error.
- Latest capacity: 13 unused judge slots, 11 claimed; verification lease separate, no recycling. Phase 6 remains partial for conclusive pilot and product-timeout evidence. Deployment/push and Phase 7 remain deferred; no billing was enabled.

## Submission documentation draft and owner guide — 24 October 2026

- Owner requested detailed quota-recovery steps, submission documentation and local/manual verification instructions. Prepared the Phase 7 documentation draft alongside the open Phase 6 gates; no release completion is claimed.
- Rechecked the supplied Inkloom brief, qualified Round 1 Concise proposal, actual UI labels/scripts/limits, organiser page and official Gemini limits/terms. The owner's screenshot records a 21/20 daily request peak for 3.6 while minute/token peaks are below their shown limits. Confirmed midnight Pacific corresponds to 12:30 p.m. IST on 24 October; historical one-day charts are not a live balance. Earlier 503 failures remain a separate availability issue.
- Added a detailed owner guide: free-tier recovery without changing billing, separate cumulative app allowance, safe local AI-off startup, exact UI walkthrough, negative tests, image/contrast checks, existing automated commands, troubleshooting and a manual-results template. Configuration increases are conditional examples only, not applied settings. Added original fictional logo/campaign fixtures and an explicit manual visual guide.
- Added all seven submission items and suggested field text, a judging-weight evidence map, R01-R13 continuity, implementation details, changes, contribution/AI disclosures and exactly three bounded Round 3 improvements. Updated the plan's stale status table and README links; synced the external plan copy.
- Generated a six-page editable DOCX and PDF labelled DRAFT. The first canonical render lacked LibreOffice on PATH; Windows Word COM was denied. Used the existing portable LibreOffice with the canonical renderer and writable local temporary folder. Reviewed every page, removed inherited title-border residue and re-rendered. Final pages 2-6 were pixel-identical to their reviewed pages; the final changed first page was separately inspected. Page count, R01-R13, model/email, pilot figures, active links and document borders were checked.
- No application runtime code, actual service settings or evidence reports were changed. No Gemini request, pool allocation, billing activation, upload, submission, push or deployment occurred for this documentation work. The conclusive pilot, actual product-timeout check and final deployed/public-link gates remain open. The walkthrough is an instruction set, not a claim that its additional manual cases were performed today.

## Runtime performance audit and authorised repairs — 24 October 2026

- Owner requested a real local error/performance audit, then authorised repairs. Preserved the original audit and safe before/after evidence in `docs/evidence/local-performance-2026-10-24`. No Gemini requests or allowance increases were made during these runs.
- Replaced independent review/history/count fetches with a shared request-scoped desk snapshot and one post-action refresh. The proxy renews cookies without treating the cookie user as identity; protected pages/handlers retain live Auth validation, lease/account matching, membership and RLS. Independent lease/Auth and review reads run in parallel. Removed the extra workspace-name query.
- Demo start navigates once. Role transitions keep the workspace inert until the new server role arrives. Reloads are deduplicated. Approval loading/error/current states are distinct; displayed current approval must match screen version IDs. AI starts off and reflects server availability. Counts update after decisions, and the smooth-scroll warning is corrected.
- Expanded the existing browser journey with pending controls, zero duplicate browser history reads after SSR, confirmation/counts, manager clarification, unresolved-blocker rejection, controlled delayed/failed refresh recovery, image approval/download and both content/source invalidation. Development passed in 2.4 minutes; fresh production passed in 1.9 minutes. Permission suite passed with zero failures; 49 rule tests, final lint and TypeScript passed. Anonymous snapshot/state/history HTTP reads returned 401.
- The first fresh build hit the known Windows output-directory EPERM. Explicit `.next` write access was granted and the fresh production build passed. A separate text-only production comparison had no console warnings/errors or unhandled JavaScript exceptions: reload 5.20 s → 2.50 s with 29 → 11 Supabase calls; approval/settle 7.20 s → 4.38 s with 33 → 15 calls. These are individual instrumented local observations with a 750 ms quiet wait, not averages or a hosted SLA.
- The three repair-verification browser runs used three fresh slots. Capacity reached 4 unused / 20 claimed. Automatic approval review initially rejected remote provisioning; the owner then explicitly approved 20 additional fictional workspaces / 60 accounts. Added exactly that amount, preserved existing identities/leases/data and kept free billing, five session attempts and the cumulative app cap of 22.
- The content seed was resumed from the fresh private manifest after a partial generic failure. Added a setup-only readiness preflight to avoid signing into already populated workspaces on resume, plus safe stage/status/code diagnostics. Final seed passed; all 20 added workspaces had their six sources, initial draft and 60 memberships/identities checked. A real newly added creator sign-in/scoped read passed. Final capacity: 24 unused / 20 claimed, plus two verification workspaces. Credentials and `DEMO_POOL_SIZE=44` remain only in ignored `.env.local`.
- Restarted the optimized local build on port 3137 with AI off and the updated manifest. Temporary instrumentation server stopped. No GitHub push or Vercel deployment. The deployment needs a private manifest/settings sync before public judging. The live-AI pilot, actual provider-timeout check, full accessibility/unassisted trial and final hosted gates remain open; larger-history pagination remains an explicitly unimplemented growth item. See `docs/PERFORMANCE_FIXES_AND_WORKFLOW.md`.
