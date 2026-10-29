# Local performance and error audit

**Follow-up:** the runtime performance/loading fixes and new verification are recorded in [Performance fixes and workflow](PERFORMANCE_FIXES_AND_WORKFLOW.md). The measurements below describe the original state and are retained as baseline evidence.
24 October 2026 · Brand Review Desk · source baseline `6dced31`
The slowness is reproducible. Repeated remote requests and a sequence of screen refreshes are substantial contributors. Development mode adds overhead, but the existing production build is also slow. Gemini was disabled during this audit, so provider latency does not explain these measurements.

The tested manual workflow functions. It needs performance and loading-state fixes before a smooth judge demonstration. This audit did not change application logic, enable billing, call Gemini, push code or deploy anything.

## What was run

- Headless Chromium against the running development app at `http://localhost:3137`, using actual Supabase Auth, database and private storage.
- A separate temporary production server on port 3138, using the existing `.next` artifact built on 24 October at approximately 00:43 IST. Runtime source predates that artifact; subsequent tracked work was tests, scripts and documentation. This is a useful comparison, not certification of a fresh release build.
- Real fictional-data journeys: save versions, exact/manual checks, submit, change roles, record issue decisions, request and answer a clarification, correct a draft, approve independently, download the actual HTML record, upload images, publish a logo and palette, approve an image campaign, and invalidate approval by publishing changed sources.
- Explicitly labelled browser-only delayed-history and failed-history probes. These diagnose rendering under slow/error responses; they are not claims that Supabase naturally returned those errors.
- Unit tests, lint, TypeScript and production build attempts. Forty-nine unit tests, lint and TypeScript passed. The fresh build attempts failed on Windows directory permissions, described below.

Timings are individual diagnostic observations, not averages or a performance guarantee. A step includes interaction time and waits until tracked browser requests have been quiet for 750 ms. Multi-action steps cannot be interpreted as latency of a single button. The production server also logged safe fetch metadata synchronously, so its timings include diagnostic overhead. No CPU profile or geographic network comparison was performed.

## Measured delays

| Action | Development | Existing production artifact |
| --- | ---: | ---: |
| Warm desk reload without images | 7.27 s | 5.20 s |
| Warm desk reload with images | Not measured | 5.90 s |
| Save a new campaign and settle | 6.01 s | 6.99 s |
| Switch role and settle | 6.23–8.78 s, four observations | 5.06–7.82 s, six observations |
| Approve a clean version and settle | 8.40 s | 7.20 s |
| Download approved HTML | 7.14 s | 3.67 s text / 3.20 s image campaign |

Different campaigns, cache state and network conditions were involved; these are not matched benchmark trials. The result that matters is that removing the development server did not remove the several-second waits.

The clearest production examples:

- One warm desk reload made **29 Supabase requests**, including **8 Auth user lookups**, 4 lease resolutions and 4 membership reads. The desk document took 1.86 s, then the two identical history requests took 1.72 s and 2.51 s.
- Approve returned HTTP 200 after **1.29 s**, but the screen took **7.20 s** to settle. The browser then fetched history, fetched full workspace state, and fetched history and counts again. This sequence made **33 Supabase requests**.
- A warm image-campaign reload made **49 Supabase requests** and three history requests. Two private-image view requests also required validation/signing.
- Across this instrumented production journey, individual Auth, lease and membership requests had medians around **0.24–0.25 s**. Repeating and serialising these remote calls adds noticeable time even though each request succeeds.
- The measured final workspace JSON was only **7,745 bytes**, with 3 source snapshots, 2 campaigns and 3 content versions. Large current JSON payloads are not supported as the main explanation in this small fixture.

## Findings and recommended order

### 1. Duplicate review-history requests — high performance priority

`ReviewPanel` and `HumanReview` each fetch the same full history independently. Development effect replay makes this worse: four history requests occurred on a warm development reload. Production still made two; after the current run loads, the keyed human-review component can remount and make another request.

Evidence: `src/components/review-panel.tsx:35`, `:65`; `src/components/human-review.tsx:17`; browser request logs.

Fix direction: load and share one authoritative review response per selected campaign/version, then invalidate it deliberately after mutations. Retain development Strict Mode; disabling its checks would hide extra development work while leaving production duplication.

### 2. Repeated remote identity/access checks and serial reads — high performance priority

Each protected request validates Auth in the proxy, then resolves the lease, validates Auth again and reads membership in the handler context. History subsequently awaits check runs before requesting events, approval state and previous approvals. One normal history request therefore involves eight remote calls, several in series.

Evidence: `src/proxy.ts:22`; `src/server/demo.ts:45–51`; `src/server/review.ts:13–18`; production fetch trace.

Fix direction: review the request authentication boundary, deduplicate validated identity safely within one request, parallelise independent reads, and consider one scoped read operation for related review data. Preserve lease checks, workspace isolation, RLS and server-side approval validation. Do not cache an approval as current across edits or source changes.

### 3. Successful actions trigger several refresh waves — high performance priority

After an action is saved, the UI separately reloads history, reloads all workspace data, and remounts panels that fetch again. The 1.29 s approval versus 7.20 s screen-settle measurement makes this visible.

Evidence: `src/components/human-review.tsx:27–29`; `src/components/review-panel.tsx:43`; `src/components/workspace-editor.tsx:98`, `:134` and component keys near the end of that file.

Fix direction: use one post-mutation refresh contract, update affected state once, and avoid remounting a panel merely to refresh information already returned. Keep the server as the authority for successful saves and approval.

### 4. Extra navigation work when starting a demo — medium performance priority

Starting the demo calls `router.push('/desk')` immediately followed by `router.refresh()`. Development diagnostics showed repeated/cancelled desk navigation requests. This is redundant navigation work, not an unhandled server crash.

Evidence: `src/components/demo-controls.tsx:22`; development network/server observations. The production entry button was absent in the existing artifact, so its click path could not be compared there.

Fix direction: navigate once and track completion of the actual navigation.

### 5. Role switch briefly leaves the previous role's UI active — high usability priority

After the switch-role request finishes, the selector becomes enabled and the updating message disappears before the refreshed role arrives. In six production observations, the previous role remained displayed for approximately two seconds after the POST. Users can interact with controls that no longer match their signed-in identity.

Evidence: role-transition observations; `src/components/demo-controls.tsx:40–42` clears busy immediately after scheduling a refresh.

Fix direction: keep the transition pending until the new server-rendered role is installed. No permission bypass was demonstrated; this is a misleading transitional UI, with server guards still in place.

### 6. Approved content is labelled unapproved while loading — medium correctness priority

An approved campaign briefly says **No current approval** while its actual approval response is pending. A controlled two-second history delay reproduced this and the proper approved status appeared afterward.

Evidence: `src/components/human-review.tsx:44`; production `controlled-approved-loading-probe`.

Fix direction: render a distinct loading state until an authoritative approval result is available. Do not translate unknown status into an unapproved decision.

### 7. A failed history read leaves a loading message indefinitely — medium reliability priority

When the browser was deliberately given a history HTTP 503, the panel showed the error but continued displaying **Loading approval status…** and **No current approval**. Its error branch sets an error without a settled load state.

Evidence: `src/components/human-review.tsx:19`, `:44`; production `controlled-history-failure-probe`. The injected 503 was not a naturally observed backend outage.

Fix direction: distinguish loading, loaded and failed states and provide an explicit retry. Keep approval/download actions unavailable until verification succeeds.

### 8. AI remains selected when the server has disabled it — medium usability priority

The AI checkbox defaults to checked even with `AI_CHECKS_ENABLED=false`. A real local check with consent produced a saved `ai_not_configured` failure. The session's attempt count did not change and no provider call was made.

Evidence: `src/components/review-panel.tsx:23`; development `disabled-ai-result` observation and production checkbox observation.

Fix direction: pass the non-secret availability flag into the UI, explain the unavailable service and default to the supported manual path. This setting mismatch is not evidence that Gemini slowed the audited manual workflow.

### 9. Load latest permits overlapping reloads — medium usability/performance priority

The button stays enabled while reloading. Two clicks produced two concurrent full-state requests in both development and production. Production tracing recorded 14 Supabase requests for those two reads.

Evidence: `src/components/workspace-editor.tsx:134–149`; double-click observations and waterfall.

Fix direction: show pending state and deduplicate an in-flight reload. The same principle should apply to the manually triggered count refresh.

### 10. The browser test can miss the approval loading state — medium verification priority

The existing test waits for an exact text match of `Loading approval status…` to disappear. That text shares a paragraph with the status heading, so the exact locator does not match it even while loading is visible. Its negative assertion can pass prematurely.

Evidence: `tests/browser/journey.spec.ts:136`; `src/components/human-review.tsx:44`. The same selector mistake stopped the development diagnostic harness; a corrected partial-text locator allowed the production probe to finish.

Fix direction: wait for an explicit loaded/error marker and assert the expected approval result. An absent unmatched locator is not proof that loading completed.

### 11. Recurring counts need a manual refresh — low usability limitation

A confirmed issue was saved correctly, but the counts panel remained empty until **Refresh counts** was clicked. The explicit refresh then showed the correct table. This is a stale-screen limitation, not evidence that the count query loses decisions.

Evidence: development `counts-require-manual-refresh`; `src/components/issues-panel.tsx:14`; its key in `workspace-editor.tsx` does not change merely because a finding decision was recorded.

Fix direction: invalidate counts after a relevant decision, or clearly label them as a snapshot requiring refresh.

### 12. Smooth-scroll configuration warning — low priority

The development console warns that smooth scrolling on the HTML element needs `data-scroll-behavior='smooth'` on that element.

Evidence: `src/app/globals.css:6`; `src/app/layout.tsx:12`; development console log.

Fix direction: add the corresponding HTML attribute if retaining smooth scrolling. This warning does not account for the multi-second data waits.

## Release and growth limitations found

### 13. Existing production home lacks Start demo despite the runtime flag

The existing `.next` artifact statically rendered the homepage with demo access disabled. Starting that artifact with the flag enabled made the demo API work, but did not change the prerendered homepage. The home offered only the illustrative example.

Evidence: `src/app/page.tsx:11`, `:28–29`; existing prerender manifest; production browser `static-home-start-missing` observation.

For the internal diagnostic only, the harness called the real demo API and navigated to the desk. **This is not a passing self-service judge entry.** Build with the correct flag and verify the resulting home, or intentionally make this configuration runtime-aware. This result applies to the local existing artifact; the deployed Vercel URL was not audited in this turn.

### 14. Fresh builds could not finish in this restricted Windows environment

Two attempts to create a separate `.next-perf-audit` build failed with `EPERM: operation not permitted, mkdir`: first at `static/chunks/app/api/health`, then at `server/app/api/review`. Lint and TypeScript had passed. No TypeScript compilation error was reported by those failed build attempts.

Treat fresh build reproducibility as unresolved here. Verify it in the owner's normal terminal or the final build environment; the existing artifact comparison does not substitute for this check. No permission settings or security software were changed.

### 15. Workspace and history reads have no pagination — growth risk

The current state query retrieves every source snapshot, every campaign and its versions. History reads retrieve all check runs, events and approvals for a campaign. This can increase response work as usage grows.

Evidence: `src/server/content.ts:10–12`; `src/server/review.ts:13–18`, `:54–57`.

This is source-confirmed design risk, not a demonstrated large-data slowdown or truncation in this audit. The fixture was small. Start with the current campaign/version and load older history on demand, preserving immutable history.

### 16. Only seven fresh demo slots remained after testing — operational limitation

The actual capacity query returned **7 available, 17 claimed** after the audit. Across the development and production diagnostic runs, three fresh judge slots were used. Nothing was recycled or reset. Capacity is a point-in-time observation and can change as visitors start demos.

Before sharing widely, provision enough unused sandbox workspaces and verify the pool manifest in the deployment. Running out presents an entry failure even when the application itself is healthy.

## What passed, and what is not credited

Passed in this turn:

- Save/reload, numbered correction, deterministic findings, manual checks and submission.
- Expected rejection of approval with unresolved blocking issues.
- Issue confirmation, explicit count refresh, clarification request and manager reply.
- Separate reviewer approval and actual HTML downloads.
- Actual private PNG upload and validation, logo/palette publication, saved image metadata and image-campaign approval.
- New source publication made an old approval historical; download disappeared and a direct export request returned the expected HTTP 409.
- No unhandled browser JavaScript exceptions in either recorded normal journey. All recorded instrumented production Supabase calls completed without HTTP errors.
- Forty-nine unit tests, lint and TypeScript.

Not credited as unexpected errors: the intentionally injected history 503, expected blocker HTTP 400, expected stale-export HTTP 409, and cancelled development navigation requests. They are respectively controlled probes, working guards and navigation diagnostics.

Two earlier diagnostic harness waits were wrong: one expected a reason-required button to re-enable after its reason was cleared; another used the unmatched exact loading-text locator described above. Those harness failures are not product crashes. The development raw record retains its selector failure; the corrected production run completed all planned stages.

Not verified here: current Gemini availability or accuracy, the remaining pilot and actual provider-timeout gates, a fresh successful production build, deployed Vercel behaviour, multi-user load, or a full accessibility/security audit. The permissions suite was not rerun in this turn; its earlier result is separate evidence.

## Next repair pass

1. Share review data and remove redundant post-action fetch/remount waves.
2. Reduce repeated remote access-check work safely and parallelise independent reads.
3. Correct role-transition, approval-loading/error and reload pending states; make AI availability truthful.
4. Repair the loading assertion and rerun the same end-to-end journey, including negative cases.
5. Verify a fresh production build, public Start demo entry, sufficient sandbox capacity and final hosted behaviour.

Measure the same reload and approve actions after the fixes. No reduced latency target is claimed until it has been measured.

## Evidence

- [Summary, timed steps and selected request waterfalls](evidence/local-performance-2026-10-24/summary.json)
- [Completed production browser diagnostic](evidence/local-performance-2026-10-24/production-browser.json)
- [Development browser diagnostic, including the labelled harness stop](evidence/local-performance-2026-10-24/development-browser.json)
- [Production Supabase metadata trace](evidence/local-performance-2026-10-24/production-supabase.jsonl)

Evidence contains timing/status/path metadata and fictional diagnostic observations. It excludes keys, passwords, cookies, auth headers, response bodies and signed-URL queries. Separate browser contexts were closed, the temporary instrumented production server was stopped, and the existing development server on port 3137 was left running. Its homepage returned HTTP 200 at the final check.
