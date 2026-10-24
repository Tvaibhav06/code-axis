# Performance fixes and workflow verification

24 October 2026 · DIZZY DEV · Brand Review Desk

The tested Round 2 workflow matches the qualified proposal and the Inkloom brief's central requirement: review saved campaign content against approved sources, explain findings, revise, obtain an independent human decision and export the approved snapshot. The manual path works end to end. AI quality and final hosted readiness remain separate open gates.

## Measured result

| Production observation | Before | After |
| --- | ---: | ---: |
| Warm desk reload, text fixture | 5.20 s | 2.50 s |
| Supabase requests during that reload | 29 | 11 |
| Remote Auth lookups during that reload | 8 | 1 |
| Approve text and finish refreshing | 7.20 s | 4.38 s |
| Supabase requests during approval/refresh | 33 | 15 |
| Switch to reviewer and settle | 7.23 s | 3.63 s |

These are individual local observations using actual Supabase, with AI disabled and a 750 ms network-quiet wait. They are not averages, an SLA, or a promise of the same latency on Vercel. Both comparisons used safe fetch instrumentation; the earlier run used an existing production artifact, while the repaired run used a fresh successful production build. A separate image journey also passed on the repaired production build, with a 2.91 s initial text-fixture reload and 3.86 s image-approval step; those are separate observations.

## Changes applied

- The server supplies one shared desk snapshot containing workspace data, selected-campaign review, recomputed approval, issue counts and a non-secret AI availability flag. Independent check/history/approval/count component fetches have been removed.
- One snapshot refresh follows a successful save or review action. Component remounts no longer trigger duplicate history reads. Pending reloads are deduplicated and the refresh button is disabled until completion.
- The proxy only renews the cookie session. Every protected handler/page still calls the authoritative `getUser` check, verifies its lease, checks the account against that lease and verifies membership. No decoded cookie identity is used as authorisation. Lease resolution and the user lookup now run in parallel, as do independent review reads.
- Workspace name is returned with the existing workspace query, avoiding another read.
- Demo start navigates once. Role switches stay pending through the actual server-rendered transition, and the workspace is inert during the switch.
- Loading no longer means “No current approval.” Failed reads settle into an error state and hide approval/download controls until recovery. The displayed approval also has to match the content and source IDs on the screen.
- AI starts off, and its checkbox is disabled with an explanation when the server has disabled AI. Exact checks and explicit manual approval remain available. No provider call or allowance increase was needed for these repairs.
- Counts update in the same snapshot after a decision. Manual refresh remains available without overlapping requests.
- The browser test waits for an explicit loaded/error marker. It now checks refresh failure recovery, pending controls, automatic counts and source invalidation in addition to the original journey.
- The homepage reads the demo switch at request time, preventing an old build-time flag from hiding the entry button. The HTML smooth-scroll attribute removes the configuration warning.
- A fresh production build passed after explicit write access to the generated `.next` folder was granted. The initial failed attempt remains a Windows permission diagnostic; no filesystem protection settings were disabled.

The original audit is retained as historical evidence, rather than rewritten as though these failures never occurred.

## Workflow that was checked

| Step | Intended behaviour | Verification |
| --- | --- | --- |
| Manager defines approved material | Publish facts, owners, references, dates, terminology, logo and palette as immutable source versions | Permission checks and actual browser publication |
| Creator saves a campaign | Save purpose, audience and English text; optionally attach a privately stored PNG/JPG, alt text, manual image checks and selected contrast pair | Browser journey and image permission checks |
| Review saved content | Deterministic checks compare supported patterns to current sources. Optional real AI is consented and separately labelled | Exact/manual path passed here; earlier real-AI evidence retained, pilot still open |
| Explain and revise | Show quoted findings, source links/IDs, categories and proposed corrections. Changes create a new saved version requiring a fresh check | Rule tests, saved correction and reload |
| Collaborate | Record comments, confirmed/disputed issues and clarification notes. A manager's clarification does not silently change approved facts | Real browser confirmation, automatic counts and manager reply; permission/rule tests cover decision rules |
| Independent review | Submit the saved version. A separate reviewer resolves blockers and completes the required checklist. Manual boxes cannot override an unresolved blocker | Browser HTTP 400 rejection and permission checks |
| Approve and hand off | Check current versions, role, supporting-source validity and checklist; download the actual escaped HTML record | Browser approval/download and database guards |
| Invalidate stale approval | A changed saved draft, newly published source or expired supporting fact makes the earlier approval historical | Both content and source invalidation passed in browser; expiry passed in permission checks; stale export returned HTTP 409 |

This is a focused prototype, not general publication automation. Visual logo, spacing and readability checks are manual; selected-colour contrast is not a full image-accessibility audit. Document import and the other three agreed improvements stay in Round 3. The app does not automatically publish campaign content.

## Verification completed after the repairs

- 49 rule/input/image/handoff unit tests passed.
- Real Supabase permission suite passed with zero failures, including role isolation, stale writes, expired support, private images and independent approval.
- Expanded browser journey passed against development in 2.4 minutes and fresh production in 1.9 minutes. It used real storage and database operations, with AI off.
- The journey covered issue confirmation, clarification/reply, correction, image upload and approval, actual HTML download, blocked approval, delayed refresh, controlled HTTP 503 recovery, content invalidation and source invalidation. The deliberately injected failure is not counted as a naturally occurring Supabase outage.
- Separate matching text-only production comparison completed without console warnings/errors or unhandled JavaScript exceptions.
- Anonymous HTTP reads of snapshot, state and review history returned 401.
- Final lint, TypeScript and fresh production build passed. No package upgrade or dependency change was required.

## Remaining work and limits

1. **AI:** the conclusive ten-case pilot and actual provider-timeout gate remain open. No new Gemini calls, billing changes or application allowance increases were made in this repair pass. The earlier successful single-call journey does not establish reliable ongoing availability.
2. **Deployment:** these are local fixes, not a verified Vercel release. Before redeploying, privately sync the current server manifest/settings and check the public Start demo journey with unused capacity. No secrets belong in Git.
3. **Larger datasets:** pagination/on-demand archival reads remain a growth item. The current queries still retrieve full workspace/version and campaign history. The measured fixture is small; this limitation is explicitly retained rather than introducing late schema/API changes and silently cutting accessible history. It is not credited as repaired.
4. **Demo capacity:** see the separately recorded replenishment result below. Used workspaces are not recycled, and existing leases/counters must remain intact.
5. **Product scope:** no full accessibility audit, unassisted usability trial, general factual-verification claim or confidential-client-data readiness is established. The free-tier demo remains fictional-data-only with clear disclosure.

## Demo capacity

After the tests, capacity was 4 unused / 20 claimed. Automatic approval review initially blocked replenishment because adding persistent remote accounts required clearer authorisation. The owner then explicitly approved exactly 20 additional fictional workspaces and 60 Auth accounts. Those accounts and their sources/drafts are now provisioned and checked. Final capacity was **24 unused / 20 claimed**, with two separate verification workspaces. Existing leases and consumed AI allowance were preserved; the limits remain five attempts per session and 22 cumulative app attempts, with free billing.

An initial resumed content seed stopped partway through. The setup script now checks which workspaces already have sources and campaigns before signing in, preserves them and logs a safe stage/status/code if a remaining setup operation fails. The resumed run completed, all 20 added workspaces passed read-only content/membership/identity checks, and a real new creator sign-in plus scoped read passed. No guessed cause is assigned to the earlier generic seed failure.

The private manifest and `DEMO_POOL_SIZE=44` are saved only in `.env.local`. Before any Vercel release, copy the current manifest and settings privately into its environment; a stale deployment manifest does not know about newly registered slots. The local optimized production build is running on port 3137 with AI off. Its server was restarted after provisioning and the homepage returned HTTP 200 with Start demo present. No Vercel push or deployment was performed.

## Evidence

- [Repair checks, source fingerprints and timed request counts](evidence/local-performance-2026-10-24/repairs/summary.json)
- [Completed production journey](evidence/local-performance-2026-10-24/repairs/production-journey.json)
- [Matching text-only browser timing record](evidence/local-performance-2026-10-24/repairs/text-only-browser.json)
- [Original audit and before measurements](LOCAL_PERFORMANCE_AUDIT_2026-10-24.md)

Generated screenshots remain local test outputs. Recorded JSON and trace metadata exclude API keys, passwords, cookies, headers and signed-URL queries.
