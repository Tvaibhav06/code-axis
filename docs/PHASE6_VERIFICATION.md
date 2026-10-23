# Phase 6 local verification

24 October 2026, Asia/Kolkata. Status: **partial; the live-AI reliability gate failed**. No deployment was made or changed.

## Measured results

| Check | Result | Scope |
|---|---|---|
| Rule unit tests | 49/49 passed | Four unit files; no mocked AI in the product |
| Real Supabase permission tests | Zero failures, freshly rerun | Includes stale writes/history, role isolation, edit/approve race, source invalidation, expired supporting fact, private files and image approval gates |
| Chromium text/manual journey | Passed | Start demo, saved-copy checks, revision, separate reviewer, manual checklist, actual HTML download, edit and rejected stale export after reload |
| Chromium image/manual journey | Passed | Manager uploads/publishes logo and palette; creator uploads image/alt text/checklist; review, approval, actual download and invalidation |
| Narrow viewport and keyboard entry | Passed within journey | 390 px viewport without horizontal page overflow; skip link receives keyboard focus; not a full accessibility certification |
| Real-AI browser journey | Failed at first AI check | Actual saved run recorded provider_http_503; no automatic retry or model switch; not counted as a manual journey pass |
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

Across the pilot and failed real-AI browser attempt, 11 actual product AI calls were made: 4 complete and 7 HTTP 503. The app's cumulative global allowance was set to 12 and per-session cap remained 5; no billing was enabled. One unit of allowance remains from this run, assuming no subsequent use. No automatic reset or increase was performed. Provider quotas remain project-specific; 12 is an application cap, not a guarantee of Google's quota.

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

# Ten additional real calls; do not run against the remaining one-call allowance.
npm.cmd run pilot
```

Use a workspace-owned TEMP/TMP folder if the restricted Windows host cancels file downloads. Generated browser files, downloads and auth cookies are ignored; no `.env.local` content belongs in a report or commit. No CI, durable queue or fourth test suite was added.

## Remaining exit gates

1. Resolve/reassess real-provider availability and review the remaining free-tier quota before any rerun. Keep original results and report a rerun separately.
2. Complete the real-AI journey and a conclusive ten-case pilot. A working manual path does not close the AI gate.
3. Independently exercise session/global exhaustion and recovery, and a real product timeout. Limits exist in SQL, but these failure paths have not all been demonstrated in Phase 6. Maximum-size decoding passed unit tests; a 5 MB browser-to-storage upload remains to be exercised.
4. Any unassisted user trial and final production/deployment checks remain unverified. Phase 7 may draft truthful material, but cannot call the whole product submission-ready yet.
