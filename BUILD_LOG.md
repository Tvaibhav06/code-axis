# Build log

## Phase 0 — started 23 October 2026 (Asia/Kolkata)

**Status: Public shell verified; Phase 0 service gate remains open. Phase 1 foundation prepared, not yet verified with real demo accounts.** No phase is marked complete without its exit evidence.

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
| 2–5. Sources, checks, approval, images/export | Not started | Await foundation/access gate |
| 6. Pilot/verification | Not started | Await working core journey |
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
