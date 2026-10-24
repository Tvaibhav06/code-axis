# Brand Review Desk local run and manual verification

Owner guide for Vaibhav Tandon, DIZZY DEV. Updated 24 October 2026, Asia/Kolkata. Start with the AI-off walkthrough below. It uses the real database, identities, private storage and approval logic without spending Gemini quota. Do not treat it as a successful AI evaluation.

**After the repair pass:** the verified optimized build is running at `http://localhost:3137` with AI off. See [measured repairs and workflow checks](PERFORMANCE_FIXES_AND_WORKFLOW.md). The owner-approved pool now has 44 judge workspaces in total, with 24 unused at the final check, plus two verification workspaces. Keep the updated `.env.local` manifest; privately sync it before deploying. Counts are refreshed automatically after review decisions, with an explicit refresh still available.

For a future optimized local run, stop the existing server first, then use a matching build/start directory:

```powershell
$env:BRD_BUILD_DIR = '.next'
$env:AI_CHECKS_ENABLED = 'false'
npm.cmd run build
if ($LASTEXITCODE -eq 0) { npm.cmd run start -- --port 3137 --hostname 127.0.0.1 }
```

Rebuild after changing application code. Use the development instructions below when you want automatic updates while coding. A Windows output-folder permission failure requires correcting access to that generated folder; it is not fixed by increasing service quotas.

## 1 Understand and recover from the current quota error

Your screenshot shows Gemini 3.6 Flash at **21/20 requests per day**, **2/5 requests per minute**, and **687/250K tokens per minute**. The panel reports peak usage over the selected period. Together with the recorded `provider_quota` result, this confirms a daily-limit breach at that snapshot. It does not establish the live balance at a later time. The earlier HTTP 503 responses are separate provider-availability failures.

### Keep the free tier and wait for the daily reset

1. Stop running the AI smoke check, pilot and real-AI browser test. Close other tools using this project's key. Repeated requests will not create more daily quota.
2. In Google AI Studio select **code axis**, then **Rate Limit**. Confirm the row for the exact model in `.env.local`, currently `gemini-3.6-flash`.
3. Google's daily request quota resets at **midnight Pacific time**. On 24 October 2026 that is **12:30 p.m. IST**. If that time has already passed, check the current quota period rather than assuming the old screenshot still describes it. After Pacific daylight saving ends, the corresponding IST time changes. The chart's displayed UTC-8 axis is not itself the quota-reset rule.
4. Refresh Rate Limit and Usage after the reset. The one-day peak chart can still include the previous exhausted period; use current-period usage and one controlled product request to establish recovery. Resetting a daily quota does not guarantee that 503 errors will disappear.
5. Keep `GEMINI_BILLING_TIER=free`. Creating another key in the same project does not increase its quota because limits are project-wide. Billing is an optional owner decision; this guide does not enable it.
6. The screenshot shows headroom for 3.8, but that model previously timed out in this project. Do not select it as a presumed reliable fallback. A deliberate model change needs its own structured-response check and a separately reported evaluation. Both current model selectors point to 3.6, so selecting the fallback currently gives no independent redundancy.

Sources: [Google rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) and [Google troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting). Limits shown in your account take precedence over examples or assumptions.

### Check the separate application allowance

There are two independent restrictions. Google enforces its own quota; the app reserves attempts in Supabase. Waiting for Google does **not** reset the app counter, and increasing the app cap does **not** increase Google quota.

Recorded local consumption is **18 reservations against a cumulative cap of 22**: 17 provider calls plus one database-only diagnostic. Four app units remain if nobody has used more. The regular session cap is five, across creator, manager and reviewer. Provider failures count after reservation; denied reservations do not count.

For a future ten-call pilot, first verify at least ten Google requests remain and agree the application allowance. **Example only, not applied by this documentation:** if consumption is still 18, a cap of 28 leaves ten new app attempts. A cap of 30 leaves twelve for a ten-case pilot plus two additional product checks. Choose headroom from the actual provider balance and retain judging capacity; 20 daily requests is a small shared allowance.

To apply a reviewed cap yourself:

1. Stop the local app with Ctrl+C.
2. Edit only `GLOBAL_AI_ATTEMPT_LIMIT` in `.env.local` to the chosen cumulative cap. Keep `DEMO_AI_ATTEMPT_LIMIT=5`. Do not overwrite the file or delete its generated manifest.
3. In your Supabase SQL editor run the existing configuration function once. For the ten-call example only:

```sql
select public.configure_demo_pool(5, 28);
```

4. Keep the SQL value and `.env.local` value consistent. This changes the ceiling and preserves consumed attempts. Do not edit `global_attempts`, delete leases or recycle workspaces.
5. Alternatively `npm.cmd run seed:demo` applies those settings and checks the existing accounts; it preserves claimed slots. It is not required on every startup.
6. Restart the app, then make only the reviewed test requests. Do not repeatedly run `smoke:services` as a workaround: those direct diagnostics do not reserve from the public app counter but still use provider quota.

No cap increase, model change, new provider request or billing change was performed while writing this guide.

## 2 Start the existing project safely

### Open the correct folder

Open PowerShell and enter:

```powershell
Set-Location -LiteralPath 'C:\Users\Vaibhav Tandon\Documents\Codex\2026-10-20\im-participating-in-a-hackathon-here-5\brand-review-desk'
node --version
npm.cmd --version
```

Use Node 22. `npm.cmd` avoids the PowerShell execution-policy error that can block `npm.ps1`. If `node` is not found, install/select Node 22, then reopen PowerShell.

### Keep the current service setup

The existing project already has migrations 001-007, the server key, generated account manifest and seeded SampleCo workspaces. Do **not** rerun the schema-creation SQL or recreate accounts to start locally. Keep `.env.local` unchanged unless intentionally editing a setting. It must contain the Supabase URL, publishable key, service-role key, generated `DEMO_POOL_ACCOUNTS_JSON`, Gemini key/model/tier, demo switch and limits. Keys and account passwords belong only in `.env.local` and server environment variables.

For an entirely new checkout, install dependencies with `npm.cmd ci` and follow the bootstrap sections of [README](../README.md). Copy `.env.example` only if `.env.local` does not already exist. A fresh Supabase project requires migrations in filename order, `seed:demo`, then `seed:content`. Never run those creation migrations twice against the existing project.

### Start without allowing any provider request

In the project terminal:

```powershell
$env:AI_CHECKS_ENABLED = 'false'
npm.cmd run dev -- --port 3137
```

Wait for **Ready**, then open **http://localhost:3137/**. Use `localhost` consistently, including browser tests. The server override is local to this terminal and provides a second safeguard while you choose AI off in the interface. Keep `DEMO_ACCESS_ENABLED=true` in the existing `.env.local`.

If port 3137 is in use, stop your earlier server with Ctrl+C. If you intentionally choose another port, use it consistently in the browser and `PHASE6_BASE_URL`.

The project uses real remote Supabase services even when the Next.js app runs locally. Internet access and correct service settings are still required.

### Resume AI later

Only after confirming quota and app headroom, stop the app, then run:

```powershell
Remove-Item Env:\AI_CHECKS_ENABLED -ErrorAction SilentlyContinue
npm.cmd run dev -- --port 3137
```

This removes the terminal override. The `.env.local` value must then be `AI_CHECKS_ENABLED=true`. No key needs to be pasted into the terminal. Changing `.env.local` should be followed by a server restart.

## 3 Manually verify the core text workflow

Use fictional SampleCo content. Keep one browser session throughout. Refresh reuses its workspace; a new incognito session or End demo followed by Start demo consumes another non-recycled slot. The last recorded pool snapshot was 13 unused judge workspaces and 11 claimed, before any later use.

### A Enter and inspect the source material

1. Open localhost and choose **Start demo**. Expect `/desk`, SampleCo and the Creator role.
2. Select Manager in **Demo role**. Open **Brand sources** if needed.
3. Confirm the seeded approved trial is **14 days**, price is **INR 499 per month**, and the official name is **SampleCo**. The OCT10 offer is deliberately expired.
4. Do not publish unnecessary changes yet. Switch back to Creator and open **Campaigns**. Wait for saved data to load. Role changes discard unsaved edits.

### B Create a controlled conflict

1. Keep a title, purpose and audience, or select **New campaign** and fill those fields.
2. Replace the entire English campaign text with:

```text
Try SampleCo free for 30 days.
```

3. Click **Save version N**. Note the new version number. Unsaved text is not checked.
4. Leave **Include a real AI check** off, then choose **Run checks**. It now starts unchecked. When the server has disabled AI, the checkbox is disabled and the screen explains that exact/manual review is available.
5. Expect a **Source conflict** quoting the 30-day claim and referring to the approved 14-day source. The result must say manual review is required, not AI completed.
6. Reload the page. Wait for checks and approval status to finish loading. Confirm the saved copy and result survive.

### C Revise and submit

1. Replace the full copy with:

```text
Try SampleCo free for 14 days.
```

2. Save a new version. Expect the previous check to become historical and a message requesting a fresh check.
3. Keep AI off and run checks again. Expect no conflict for this trial wording.
4. Enter `Corrected the trial duration against the approved source.` in **Comment or reason**.
5. Click **Submit saved version for review**. Expect submitted status for that saved version.

### D Approve as a separate identity

1. Switch **Demo role** to Reviewer. This signs in as a different real Auth account in the same workspace.
2. Review the saved copy and sources. The creator must not have an approval button allowing self-approval.
3. Because AI was off, tick the facts, claims and tone manual-review boxes, and **I reviewed the saved copy, sources and any image checks**.
4. Click **Approve saved version**. Expect **Approved for this saved version**, a reviewer identity and timestamp, with manual review clearly labelled.
5. Click **Download approved HTML record**. Open the actual downloaded file. Check the copy, saved/source versions, review mode and approval information. It is an HTML snapshot; the private original image is not bundled into it.

### E Invalidate the approval

1. Switch back to Creator. Add `Explore it today.` to the approved copy and save another version.
2. Expect **No current approval** and no current export button. Reload and wait for all loading messages to finish; the old approval must be historical.
3. Inspect **Previous saved versions** and **Recorded approvals**. Earlier snapshots should remain readable.
4. Recheck and resubmit the current version if you need another approval. Approval never automatically transfers to a new version.

## 4 Verify the other implemented features

| Test | Manual procedure | Expected result |
|---|---|---|
| Blocking findings | Submit the 30-day version, switch to Reviewer, complete the manual checklist and attempt approval without resolving its conflict | Approval rejected; manual boxes cannot override a blocker |
| Decision history and insights | On the bad version, enter a reason and Confirm issue. Click Refresh counts, repeat the decision, then Dispute rule and refresh counts again | Saved history; deduplicated campaign/rule counts; a dispute remains unresolved |
| Clarification | Add a reason, choose Ask manager for clarification; switch Manager and Record manager clarification | Notes appear in history; they do not silently change approved sources |
| Source invalidation | Obtain a fresh approval, switch Manager, change the trial's numeric value from 14 to 21, publish, then reload the campaign | Earlier approval becomes historical; a fresh check uses the new source. Enter numbers only in that field. Restore 14 in a new source version afterwards |
| Expired support | Save `Use OCT10 for 10% off today.` and run exact checks | Expired-support finding; the old offer cannot support current approval |
| Input size | Paste more than 1,500 English words and attempt save | Clear error; no accepted oversized version |
| Wrong role | As Reviewer, inspect source/copy controls | Publication and creator editing are unavailable; dedicated permission tests also verify server rejection |
| Keyboard and narrow screen | Tab from landing to Skip to content and Start demo; use keyboard controls; inspect at about 390 px width | Visible focus, labelled fields and no horizontal page overflow; this is not full accessibility certification |

Confirming or disputing a finding does not resolve a blocker. Use **Dismiss false alarm** only when it really is a false alarm and give a defensible reason. The normal SampleCo conflict should be corrected instead. Free-text comment entry alone does not dismiss anything.

### Image workflow

1. Use the supplied fictional [logo](manual-fixtures/sampleco-logo.png) and [campaign image](manual-fixtures/sampleco-campaign.png).
2. Read the [fictional visual guide](manual-fixtures/README.md). As Manager, adopt it as the Source/reference for the existing SampleCo terminology entry, upload the approved logo, set palette `#000000, #ffffff, #245b47`, and publish a new source version. Keep the terminology value SampleCo and its aliases. The guide defines the clear-space rule, so the spacing checkbox has a real manual reference.
3. As Creator, upload the campaign PNG under **Optional campaign image**. Expect private upload and successful validation.
4. Add alt text: `SampleCo logo above an invitation to try SampleCo free for 14 days.`
5. Check the four image-review items only after comparing the image with the approved asset: logo, spacing, readability and palette. Set black text `#000000` on white `#ffffff`; expect 21:1 for that selected pair.
6. Save the image with the clean 14-day copy, rerun AI-off checks and submit. The Reviewer must complete the manual checklist before approval.
7. For negative checks, try missing alt text, unchecked image checks, or equal text/background colours. Save/recheck/submit the changed version each time. Approval must be blocked. Restore valid fields afterwards.
8. Try an actual file larger than 5,242,880 bytes and a corrupt PNG/JPG. Oversize or decoder failure must be explained; there must be no valid saved image reference to the rejected file. Do not upload personal files.

Logo/readability decisions are manual. The app does not read image text, compare logos automatically or certify the whole image's accessibility. Direct private upload keeps the 5 MB file outside the Next/Vercel function request body.

### Verify a real AI check after quota recovers

1. Remove the server AI-off override as described above. Confirm both provider quota and app headroom.
2. Start from saved text such as `SampleCo guarantees 50% less admin work.` with the unchanged seeded evidence policy.
3. Tick **Include a real AI check**, select the configured primary and consent to fictional-data processing. Press Run checks once.
4. A successful request must say **AI check completed**. Inspect its actual quote, source and explanation. The anticipated finding is missing evidence for the quantified guarantee; record the actual result even if it misses it.
5. HTTP 503, quota, invalid output or timeout must remain incomplete and expose the manual path. Do not tick manual boxes and then report that as AI success. Wait at least 65 seconds between planned provider requests and stop on another quota error.

The script for the ten-case pilot creates its own workspaces and records results. Do not mix hand-edited examples into a claimed frozen pilot, tune prompts during a run or overwrite earlier reports.

## 5 Run the existing automated checks

Open a second terminal in the same repository. Keep the local server running for browser checks only.

```powershell
npm.cmd run test:rules
npm.cmd run test:permissions
npm.cmd run check
```

Expected baseline: 49 rule tests, zero real permission failures, then successful lint/typecheck/production build. Permissions use isolated verification identities and trusted manual fixtures, not AI accuracy data. `check` builds but does not deploy or push. Avoid running a default build concurrently with a default-output development server: stop the dev server first, or use a separate ignored `BRD_BUILD_DIR` consistently.

If restricted Windows build permissions prevent using `.next`, stop the server and try a separate build folder:

```powershell
$env:BRD_BUILD_DIR = '.next-manual-verify'
npm.cmd run check
```

Do not delete caches or change filesystem permissions as a first fix. Restore/remove this terminal override before using another build folder. A failed build remains a failed check until it actually passes.

For the single Chromium journey, start the app again on port 3137. In the second terminal:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = '.cache/pw-browsers'
# Run this installation line only if Chromium is missing.
npx.cmd playwright install chromium

$env:TEMP = Join-Path (Get-Location).Path '.cache/browser-temp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
$env:PHASE6_BASE_URL = 'http://localhost:3137'
$env:PHASE6_AI = 'false'
$env:PHASE6_IMAGES = 'true'
$env:PHASE6_ALLOWANCE_EXHAUSTED = 'false'
npm.cmd run test:browser
```

This allocates a fresh demo slot and makes no provider call. Do not enable the exhausted-allowance variant after raising the cap; it expects a genuinely exhausted shared allowance. Browser traces, cookies, downloads and generated files stay ignored.

Only after quota and a reviewed allowance are sufficient, in a terminal without the server AI-off override:

```powershell
$env:PHASE6_AI = 'true'
$env:PHASE6_SINGLE_AI = 'true'
$env:PHASE6_ALLOWANCE_EXHAUSTED = 'false'
npm.cmd run test:browser

# Ten further real requests; run only with separately budgeted headroom.
npm.cmd run pilot
```

The one-call journey uses exact checks first and real AI on revised copy. Without `PHASE6_SINGLE_AI=true`, live browser mode needs two AI requests. Pilot results go to a new timestamped JSON report. A passing browser journey does not imply the pilot target passed.

## 6 Record manual results and diagnose problems

For each check, record date/time, source revision, campaign/version, role, expected outcome, actual outcome, pass/fail and a fictional-data screenshot. Record misses and failures. Keep access tokens, account manifests, API responses containing secrets and auth cookies out of reports.

```text
Revision:
Date and timezone:
Test and role:
Campaign version and source version:
Expected:
Actual:
Pass or fail:
Evidence filename:
Open issue or follow-up:
```

| Symptom | What to check |
|---|---|
| Interactive demo still being prepared | `.env.local` has DEMO_ACCESS_ENABLED=true; restart server |
| relation does not exist | Confirm 001-007 were applied to this exact Supabase project; do not jump straight to an asset migration |
| invalid credentials | Use the generated test identities; preserve the manifest and rerun seed:demo only when setup repair is required |
| All workspaces used | Check capacity and deliberately append slots through DEMO_POOL_SIZE plus seed:demo/seed:content; never reset claimed slots |
| Mutation rejected for origin | Use localhost consistently; do not mix localhost and 127.0.0.1 or weaken the origin check |
| Shared allowance unavailable despite unused session attempts | App global cap may be reached; inspect the reviewed cumulative configuration separately from Google quota |
| Provider quota / HTTP 429 | Check the model's Google quota; stop requests, wait for the relevant reset and preserve failed results |
| HTTP 503 | Provider availability is still unresolved; a quota reset alone does not establish reliability |
| Provider timeout | Record the failed run, preserve exact findings and use manual review; do not claim the required timeout test passed unless exercised |
| Download cancelled in restricted Windows environment | Use workspace-owned TEMP/TMP as above; then check the actual downloaded file |
| Approval button disabled or rejected | Saved current version, submitted status, fresh check, resolved blockers, required image/manual boxes, current source dates and independent reviewer |

## 7 Finish the submission after verification

Use [the submission checklist and field text](ROUND2_SUBMISSION.md) and [the editable/PDF draft](submission/DIZZY_DEV_CodeAxis_Round2_Project_Update_DRAFT.docx). Update the PDF after final testing. The current draft states the pilot and deployment limitations; do not submit it as a fully verified release without checking those statements.

Deployment remains deferred. When you resume it, publish the chosen reviewed source revision, copy settings privately to Vercel, verify the public journey in a fresh browser, check unused demo capacity and provider/app headroom, and then upload the final single PDF according to the Round 2 form. Do not submit a stale deployed shell as the verified working product. Preserve AI assistance and free-tier data-use disclosures.
