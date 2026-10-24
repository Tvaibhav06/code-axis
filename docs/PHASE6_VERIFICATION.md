# Phase 6 local verification

24 October 2026, Asia/Kolkata. Status: **partial; a later live-AI journey passed, but the pilot gate remains open**. No deployment was made or changed.

## Measured results

| Check | Result | Scope |
|---|---|---|
| Rule unit tests | 49/49 passed | Four unit files; no mocked AI in the product |
| Real Supabase permission tests | Zero failures, freshly rerun | Includes stale writes/history, role isolation, edit/approve race, source invalidation, expired supporting fact, private files and image approval gates |
| Chromium text/manual journey | Passed | Start demo, saved-copy checks, revision, separate reviewer, manual checklist, actual HTML download, edit and rejected stale export after reload |
| Chromium image/manual journey | Passed | Manager uploads/publishes logo and palette; creator uploads image/alt text/checklist; review, approval, actual download and invalidation |
| Narrow viewport and keyboard entry | Passed within journey | 390 px viewport without horizontal page overflow; skip link receives keyboard focus; not a full accessibility certification |
| Real-AI browser journey, first attempt | Failed at first AI check | Actual saved run recorded provider_http_503; retained as a failure |
| Real-AI browser journey, later separate run | Passed | Initial exact check, revise, one real AI check on the revised version, separate reviewer, HTML download and invalidation; not two live AI checks |
| Maximum-size browser upload | Passed in later journey | Exactly 5,242,880 bytes uploaded directly to private storage and decoded/registered by the server; one extra byte rejected by the UI |
| Shared-allowance exhaustion and manual recovery | Passed in separate journey | Fresh session had unused attempts; AI request was rejected without consuming a session attempt, exact findings survived, AI-off revision/approval/download/invalidation completed |
| Session-only database guard | Passed in controlled diagnostic | One verification-only lease with a temporary one-attempt limit accepted one reservation and rejected three more; counter remained one; normal five-attempt setting restored; no Gemini call |
| Authorised pilot rerun | Stopped on provider quota at P05 | P01–P04 returned 503 with exact findings retained; P05 returned quota failure; P06–P10 unrun; no completed AI cases |
| Lint / TypeScript | Passed | New browser test, pilot runner and expired-source assertion |
| Production build | Owner's preceding check passed | No product runtime source changed in this phase; a new Phase 6 production build was not claimed |

These are solo automated checks, not an unassisted usability trial. Browser requests used the local app and real Supabase identities/storage. Network traces, auth state files and videos were not persisted. Screenshots contain fictional content only.

## Ten-draft pilot: first run

Raw report: [pilot-2026-10-23T19-32-03-988Z.json](evidence/pilot-2026-10-23T19-32-03-988Z.json).

The ten frozen development cases came from the build plan. Every case made exactly one real Gemini request, sequentially, at least 65 seconds apart. There were no automatic retries, response mocks, prompt tuning or model changes during evaluation.

| Case | Expected | Actual |
|---|---|---|
| P01 | Trial 30 versus 14 days | Completed AI; correct conflict |
| P02 | Price 299 versus 499 INR | AI 503; exact check retained correct conflict |
| P03 | Expired OCT10 offer | AI 503; exact check retained expired-support finding |
| P04 | Sample Corp versus SampleCo | Completed AI; correct naming conflict |
| P05 | Unsupported 50% guarantee | AI 503; unresolved evaluation case |
| P06 | Disrespectful tone | AI 503; unresolved evaluation case |
| P07 | Clean trial wording | AI 503; cannot label a clean AI pass |
| P08 | Clean monthly price | AI 503; cannot label a clean AI pass |
| P09 | Clean fit wording | Completed AI; no findings |
| P10 | Clean exploration wording | Completed AI; no findings |

- AI completed for **4/10** cases; **6/10** returned HTTP 503.
- The combined pipeline caught **4/6** planted issues, including exact results retained on failed AI calls. Only **2/6** planted cases also had completed AI checks. The original JSON field `plantedIssuesDetected` counts the latter; per-case `correctIssue` preserves the exact-check evidence. The runner now gives these metrics separate names for future runs; the original first-run report was not rewritten.
- **0 false alarms among 2 clean cases with completed AI.** The other 2 clean cases are unavailable, not successful clean results. The original console's `/4` denominator must not be quoted as four completed clean evaluations.
- The planned target, at least 5/6 planted issues and no more than 1/4 clean false alarms with conclusive results, **was not met**. This run does not establish model accuracy on the unavailable cases.

Across the first pilot and failed real-AI browser attempt, 11 actual product AI calls were made: 4 complete and 7 HTTP 503. A later, separately reported browser run used the twelfth attempt and completed. **At that checkpoint, all 12 cumulative test attempts were used: 5 complete, 7 HTTP 503.** Per-session cap remained 5; no billing was enabled. No counter reset or automatic cap increase was performed. Provider quotas remain project-specific; an application cap is not a guarantee of Google's quota. A later successful request does not turn the first pilot into a pass. The subsequently authorised allowance and partial rerun are recorded separately below.

## Later one-call browser run

Started 24 October 2026 at 05:14:37 UTC (10:44:37 Asia/Kolkata). Raw summary: [one-call journey](evidence/journey-2026-10-24-one-live-call.json). Chromium passed in 2.2 minutes, with retries disabled.

- The initial bad copy received exact checks with AI off. After revision to the approved 14-day wording, **one** real `gemini-3.6-flash` call completed and was saved. This is an end-to-end AI-assisted journey, not evidence of two successful AI checks or ten-case accuracy.
- A real manager published a validated logo/palette; the creator uploaded the campaign graphic, alt text and image checklist. The maximum-size fixture was a decodable PNG with inert trailing padding to exactly 5,242,880 bytes, matching the existing unit boundary approach. It is a file-size boundary fixture, not a large-dimension image benchmark. The server reported the exact byte count after downloading and decoding it from private storage. A 5,242,881-byte fixture was rejected before upload.
- A distinct reviewer approved the saved AI-assisted version. The actual HTML download contained the saved copy and no script element. At 390 px the page had no horizontal overflow. Editing the copy removed current approval; stale export returned HTTP 409 and stayed invalid after reload.
- Screenshots: [AI-assisted approval at 390 px](evidence/live-ai-review-mobile.png), [immediate reload capture](evidence/live-ai-approval-invalidated.png). The latter was captured while background review reads were still loading; use the later loaded-state evidence below for the post-reload UI assertion. These show a local development build, not a deployment.

## Shared-allowance recovery run

Raw summary: [allowance recovery journey](evidence/journey-2026-10-24-allowance-recovery.json). Passed in 1.1 minutes. A fresh session with unused per-session allowance requested AI after the cumulative 12-attempt cap was reached. The stored result was `failed` with `session_or_global_allowance_unavailable`; the session's remaining count was unchanged. Exact conflict findings and the visible recovery message remained. The creator revised the copy and ran AI-off checks; the independent reviewer completed the manual checklist, approved, downloaded the HTML and verified edit invalidation. This was a guard rejection followed by manual recovery, **not another provider call or an AI pass**. Session-only exhaustion was checked later through the controlled diagnostic below.

After both later runs, the capacity RPC reported **15 unused judge slots and 9 claimed**. No used workspace was recycled. This supersedes the older 17/7 snapshot below.

The reload assertion was then strengthened to wait for saved checks, approval and issue counts to finish loading, rather than accepting the initial placeholder. The same shared-allowance/manual journey passed again in 1.7 minutes, without a provider call. [Loaded-state run](evidence/journey-2026-10-24-allowance-recovery-loaded.json) and [visually inspected loaded approval history](evidence/manual-approval-invalidated-loaded.png) show the edited version with a historical approval and no current approval. At that checkpoint capacity was **14 unused judge slots and 10 claimed**. Lint and TypeScript passed after the final test change. Production runtime code was unchanged.

## Authorised pilot rerun and quota stop

The owner explicitly authorised ten more test attempts. The cumulative app cap was changed from 12 to **22**, preserving consumed counters, with the normal per-session setting still **5**. Billing stayed free. The same ten frozen cases, model and prompt were used, with at least 65 seconds between requests and no automatic retries or model changes.

Raw report: [partial second pilot](evidence/pilot-2026-10-24T05-27-04-838Z.json), started 24 October at 05:27:04 UTC (10:57:04 Asia/Kolkata).

| Cases | Result |
|---|---|
| P01–P04 | All returned HTTP 503; the four exact-rule conflicts remained correctly identified |
| P05 | Provider quota error; no completed AI result |
| P06–P10 | Unrun: the runner stopped immediately on quota failure |

There were **0 completed AI responses among 5 attempted cases**. No clean case was evaluated, so no false-positive rate can be claimed. The pilot target remains unmet/inconclusive. The optional session-recovery probe in that process did not execute (`sessionProbe: null`); it is not credited as a pass. The first pilot report was not modified.

After the quota stop, a manual service-RPC diagnostic used **one verification-only lease**, temporarily configured with a one-attempt limit. One reservation succeeded; three subsequent reservations returned the specific session-exhaustion error while shared headroom remained. The resolved lease counter stayed at one. The normal five-attempt setting was restored in a `finally` step, keeping the cumulative cap at 22. [Sanitised diagnostic record](evidence/session-limit-2026-10-24.json). This proves the parameterised database guard under a controlled one-attempt limit; it is not a five-call browser test. It made **zero provider calls**, but deliberately consumed one application reservation. Manual UI recovery was demonstrated in the separate shared-allowance journey above.

Accounting for the recorded runs: **17 provider calls** across Phase 6 (5 complete, 11 HTTP 503, 1 quota error), plus **1 diagnostic-only reservation**. Thus **18/22 application reservations are accounted for**, leaving four app units absent other use. Remaining app units do not establish available Google quota. No further provider call was attempted after the quota error. The capacity RPC reported **13 unused judge slots and 11 claimed**; the diagnostic verification lease is separate and no judge workspace was recycled.

## Browser setup and evidence

- Next's local origin normalisation requires `http://localhost:3137`; the first run using 127.0.0.1 correctly hit the existing origin rejection. Production security checks were not weakened.
- A first HTML download was cancelled in the restricted Windows temporary directory. With a workspace-owned browser download/temp directory, the same actual download passed. No product export code was changed to bypass the check.
- An extra manual test launch caused by a shell-quoting error was interrupted; it is not a pass. All substantive runs have retries disabled. No used workspace was recycled.
- Evidence screenshots: [manual image review at 390 px](evidence/manual-image-review-mobile.png) and [approval invalidated after editing](evidence/manual-image-approval-invalidated.png). They show the local development build, including developer UI, and are not public-deployment screenshots.
- After these runs the pool reported **17 unused judge slots and 7 claimed**. Verification workspaces remain separate. Capacity is a snapshot, not a promise of future availability.

## Repeating the tests

From the repository root, install Chromium once:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = '.cache/pw-browsers'
npx.cmd playwright install chromium
```

Start the local app on localhost port 3137. Normal PowerShell can use `npm.cmd run dev -- --port 3137`. For the restricted agent environment a separate local BRD_BUILD_DIR was used.

```powershell
# Manual path; no provider calls. This still allocates a fresh, non-recycled judge slot.
$env:PHASE6_AI = 'false'
$env:PHASE6_IMAGES = 'true'
npm.cmd run test:browser

# Real-AI path: at most two calls; needs reviewed remaining allowance.
$env:PHASE6_AI = 'true'
npm.cmd run test:browser

# One-call variation: initial exact check, real AI on revised copy, then approval/export.
$env:PHASE6_SINGLE_AI = 'true'
$env:PHASE6_MAX_IMAGE = 'true'
npm.cmd run test:browser

# Only when the shared allowance is known to be exhausted; must not use live-AI mode.
$env:PHASE6_AI = 'false'
$env:PHASE6_MAX_IMAGE = 'false'
$env:PHASE6_ALLOWANCE_EXHAUSTED = 'true'
npm.cmd run test:browser

# Ten additional real calls; requires a separately reviewed allowance.
# In a new terminal: PHASE6_AI=true, PHASE6_ALLOWANCE_EXHAUSTED unset/false.
npm.cmd run pilot
```

Use a workspace-owned TEMP/TMP folder if the restricted Windows host cancels file downloads. Generated browser files, downloads and auth cookies are ignored; no `.env.local` content belongs in a report or commit. No CI, durable queue or fourth test suite was added.

## Remaining exit gates

1. Wait until actual provider quota/availability is verified before another run; review the remaining app allowance separately. Keep original results and report a rerun separately. No automatic retry or scheduled wake-up has been set.
2. Complete a conclusive ten-case pilot. The later one-call live-AI journey passed; this does not establish reliable provider availability or close the failed pilot gate.
3. Exercise a real product timeout. Shared-allowance exhaustion/recovery, the controlled session-only database guard and the maximum browser-to-storage upload boundary now passed.
4. Any unassisted user trial and final production/deployment checks remain unverified. Phase 7 may draft truthful material, but cannot call the whole product submission-ready yet.
