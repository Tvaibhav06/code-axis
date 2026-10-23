# Setup still needed before the interactive demo can open

Code for Phases 1–5 is prepared. This checklist is the remaining service work, not a claim that the project is submission-ready. Never paste keys, generated account credentials or `.env.local` into chat or Git.

## 1. Apply the database migrations

In the supplied Supabase project's SQL editor, apply these files **once, in order**. Check which have already been applied before running them again:

1. `202610230001_phase0_smoke.sql`
2. `202610230002_phase1_foundation.sql`
3. `202610230003_phase2_sources_campaigns.sql`
4. `202610230004_phase3_checks.sql`
5. `202610230005_phase4_review.sql`
6. `202610230006_phase5_assets.sql`
7. `202610240007_explicit_version_conflicts.sql`

If migrations 001–006 are already applied, run **only 007** next. It retains the existing functions, permissions and row locks and changes expected stale-version errors to an explicit HTTP 409 response. Do not rerun the earlier schema-creation files.

They are all in `supabase/migrations`. A SQL syntax check has passed locally; actual application, RLS, approval transactions and private storage still require verification in Supabase.

## 2. Add the server-only key locally and seed the accounts

- Add `SUPABASE_SERVICE_ROLE_KEY` only to `.env.local` and Vercel's server environment. Never use a `NEXT_PUBLIC_` prefix for this key.
- Keep `DEMO_ACCESS_ENABLED=false` while setting up.
- Run `npm run seed:demo`, then `npm run seed:content` locally.
- `seed:demo` creates 24 judge slots plus two verification workspaces, with three distinct Auth identities each. It writes `DEMO_POOL_ACCOUNTS_JSON` and dedicated smoke-user credentials into `.env.local`, without printing them. Re-running preserves claimed slots.
- The previously configured smoke login returned `invalid_credentials`. Successful seeding replaces it with a real verification account. No dashboard-login password is needed.
- `seed:content` preserves existing drafts and publications and adds the fictional SampleCo example only where empty. The optional image workflow needs a manager-published logo and palette; these can be added through Brand sources. Text-only campaigns do not require assets.

## 3. Finish Gemini settings without changing billing

- Keep `GEMINI_BILLING_TIER=free`, use fictional data only, and keep the five-attempt session limit.
- Set `GLOBAL_AI_ATTEMPT_LIMIT` to an allowance supported by the actual project quota, then re-run `seed:demo` to apply it without resetting counters. **Zero disables public AI calls.** A numeric allowance is not a provider billing cap or a daily reset mechanism.
- The owner supplied a fresh passing `gemini-3.6-flash` fixture and a timed-out `gemini-3.8-flash` fixture during setup. The local primary was explicitly changed to `gemini-3.6-flash`. Both configured slots currently use that one verified candidate; no independent fallback redundancy is claimed. A connectivity fixture is not a completed product evaluation.
- Verify the model selected as `GEMINI_MODEL` before opening the demo. If choosing the tested candidate as primary, set that explicitly and disclose the actual deployed model. The product never switches models automatically. `GEMINI_FALLBACK_MODEL` is selected explicitly in the interface.
- `AI_CHECKS_ENABLED=false` is an optional server off switch. The user can also choose exact checks only; approval then requires the manual facts/claims/tone checklist.

## 4. Run the live verification gates

Run locally after the migrations and seeds succeed:

```text
npm run smoke:services -- supabase
npm run smoke:services -- primary
npm run test:permissions
npm run test:rules
npm run check
```

`test:permissions` uses the dedicated verification identities, including trusted **manual** fixtures to test approval permissions and image gates. It does not fabricate successful AI output or measure model quality. Earlier-phase subsets are available with `--foundation-only`, `--through-phase2`, or `--through-phase4`.

On this restricted Windows environment, `.next` became inaccessible during the image-decoder build. The verified alternative uses the supported Webpack builder and a fresh local output folder:

```powershell
$env:BRD_BUILD_DIR = '.next-phase5-verify'
npm run check
```

The environment override is local only and is not required on Vercel. Use the same override when starting that local build. Generated output folders are ignored by Git. Neither compilation nor SQL parsing closes the live-service gates.

## 5. Copy settings privately to Vercel and redeploy

Copy the Supabase URL/publishable key, server key, generated manifest, Gemini settings, limits and `NEXT_PUBLIC_SITE_URL=https://brand-review-desk.vercel.app` to the existing project. Use the same temporary `PHASE0_SMOKE_TOKEN` locally and in Vercel for deployment diagnostics. The previous deployed diagnostic returned 401, so the token was missing or mismatched at that time. Environment changes need a new deployment.

After local service and permission checks pass, enable `DEMO_ACCESS_ENABLED=true`, redeploy, and complete one fresh/private-browser journey: start demo → check saved copy → revise → submit → switch to reviewer → approve → download HTML → edit and confirm old approval is historical. Check two isolated browser sessions, the private image path, AI failure/manual recovery, and session/global attempt enforcement. Disable entry again if a gate fails.

Remove the diagnostic token and production smoke-user password after setup verification. Retain only the server settings required by the product. Do not share the generated manifest publicly.

## After setup

Phase 6 still needs the one Playwright journey and the ten-draft pilot with measured results. Phase 7 still needs the seven-item submission pack and updated PDF. No runtime gate, evaluation result or deployment is marked complete merely because prepared code is committed or pushed.
