# Brand Review Desk

A focused CodeAxis project by DIZZY DEV (Vaibhav Tandon). Review campaign content against approved brand sources and keep approval with a human reviewer.

## Current status

The shell is deployed at [brand-review-desk.vercel.app](https://brand-review-desk.vercel.app). The home page and health route returned 200; the setup route rejected unauthorised requests. The landing example remains illustrative. Phase 1 foundation and Phase 2 source/campaign code are prepared with demo entry disabled by default. Runtime gates remain open until real service, permission and browser checks pass. The owner explicitly deferred service setup while continuing code preparation. See BUILD_LOG.md for measured results and blockers.

## Local setup

Use Node 22 and npm. Install the pinned dependencies with `npm ci`. Copy `.env.example` to `.env.local`, enter values locally and keep that file out of Git. Start with `npm run dev`.

Checks: `npm run lint`, `npm run typecheck`, `npm run build`.

The planned rule-unit group now uses Vitest: `npm run test:rules`. Current tests cover Phase 2 input/security boundaries; they do not certify a review engine. Playwright remains for the planned complete browser journey. No CI pipeline has been added.

The public `/api/health` endpoint checks the application shell only. It intentionally makes no claim that any external service is connected.

## Real Phase 0 service checks

1. Use a dedicated Supabase project. Apply `supabase/migrations/202610230001_phase0_smoke.sql` in its SQL editor or migration tooling. This creates only an owner-isolated temporary test table and a private PNG test bucket. The application schema belongs to Phase 1.
2. Create one fictional test user in Supabase Auth, with an email/password login. Put the project URL, publishable key and that user's credentials into `.env.local`. These checks never need a service-role key.
3. Add the Gemini API key from your **free-tier** project and keep `GEMINI_BILLING_TIER=free`. Only the fixed fictional SampleCo fixture is sent by these checks. **Google may use free-tier inputs and responses to improve its products.** Never enter confidential, client or personal information. The setting records the intended tier; it cannot inspect or change Google's actual billing. If you later choose paid access, configure its cap in AI Studio before setting `GEMINI_BILLING_TIER=paid`, `GEMINI_PAID_PROJECT_CONFIRMED=true` and `GEMINI_MONTHLY_SPEND_CAP_USD`.
4. Run `npm run smoke:services`. The script uses the real services: authenticated insert/read/delete, private image upload/download/anonymous denial/cleanup, and one structured response from each configured Gemini model. Only sanitised summaries are printed. Missing settings return **blocked** and a failing exit code, never a false pass.
5. For deployed verification, set the same variables in the dedicated Vercel project and set a random `PHASE0_SMOKE_TOKEN` of at least 32 characters. Configure Node 22. Then run `npm run smoke:deployment -- https://your-project.vercel.app` locally. Only the token travels to this protected project endpoint; it reads service credentials from its own server environment.
6. Remove `PHASE0_SMOKE_TOKEN` and the smoke-user password from production settings when setup is finished, then redeploy. This disables the diagnostic route. It is not a public review API and has no public judge call budget.

There is no automatic retry or fallback switch. Both model IDs are configured candidates until their actual calls pass. The single-turn `generateContent` REST API remains supported; using native fetch avoids another SDK dependency. The smoke fixture only verifies structured extraction, not the full review engine's accuracy.

For a focused recheck, use `npm run smoke:services -- supabase`, `-- primary` or `-- fallback`. The result includes its scope; a passing single-model check does not certify all integrations. The deployed diagnostic always checks the full set.

Import [Tvaibhav06/code-axis](https://github.com/Tvaibhav06/code-axis) into Vercel, select Next.js, leave Root Directory at the repository root and use Node 22. Add secrets in Vercel environment variables, never in Git. The shell can build without service keys; service checks will stay blocked until they are configured. After deployment, set `NEXT_PUBLIC_SITE_URL` to its actual HTTPS URL and run the deployed check. A local build or Git push does not verify deployment.

The supplied Supabase project is `https://uyowubvbofkahdoovfxb.supabase.co`. Its URL is public configuration; its publishable key and test-account settings must still be entered locally. No migration has been applied automatically.

## Phase 1 setup and verification

1. Apply `supabase/migrations/202610230002_phase1_foundation.sql` after the Phase 0 migration, using the project's SQL editor or your migration tooling. This creates workspace memberships, private asset access, demo leases and attempt counters. SQL has not been applied merely because the file exists.
2. Add the Supabase server secret/service-role key as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Keep `DEMO_ACCESS_ENABLED=false`. This key is restricted in application code to demo allocation; campaign operations will use the signed-in user's RLS permissions. The setup script also uses it to pre-provision accounts. No runtime route creates accounts.
3. Run `npm run seed:demo`. Default: **24 judge workspaces plus two isolated verification workspaces**, three real Auth identities each. Fictional `example.test` addresses are confirmed through the admin API without sending email. The script persists generated credentials only in `.env.local` as `DEMO_POOL_ACCOUNTS_JSON`, and replaces smoke-user settings with the first verification creator. No secrets are printed. Re-run with the same file to resume; it preserves claimed slots. Increasing `DEMO_POOL_SIZE` appends capacity; shrinking/recycling is refused.
4. Run the Supabase smoke check and `npm run test:permissions -- --foundation-only`. The latter uses the two verification workspaces for actual role, cross-workspace, privileged-RPC and private-file checks. Its admin key is used only for unique test-image cleanup. It does not substitute mocks for a real database or claim later approval tests have passed.
5. Copy the server key, generated manifest and required settings privately into Vercel. For the deployed Phase 0 check, the same `PHASE0_SMOKE_TOKEN` must be present locally and in Vercel. Deploy again after environment changes. Never commit `.env.local` or paste secrets into chat.
6. The current prepared revision includes Phase 2. Apply its migration/seed below before enabling this revision's workspace editor. After service/permission checks pass, enable `DEMO_ACCESS_ENABLED=true`, redeploy, then verify two fresh browser sessions receive separate workspaces, roles switch correctly and refresh restores access. Only then close the Phase 1 runtime gate. Disable entry again if the gate fails.

The public entry reserves a pre-provisioned slot atomically, uses an opaque HttpOnly lease cookie and signs in with real Supabase Auth. An eight-hour lease is never automatically recycled. Role switching accepts only a role name and resolves the account from that lease; callers cannot supply account/workspace IDs. Mutations require the same request origin. Auth cookies are renewed with the standard Supabase SSR client and Next.js proxy.

`DEMO_AI_ATTEMPT_LIMIT=5` is the free-tier setting. `GLOBAL_AI_ATTEMPT_LIMIT=0` leaves public AI calls disabled until the owner chooses an allowance from actual provider quota; setup does not assume a free-tier quota. The database reservation function counts an attempt before a future Phase 3 provider call, with conditional global/session updates in one transaction. Those limit execution tests remain part of Phase 3.

Private assets allow member reads and creator/manager uploads under their own workspace/user path. Browser overwrite and deletion are denied so saved images can later support immutable content versions. Phase 5 still needs upload-byte validation and the actual image workflow; a storage policy is not that completed feature.

## Phase 2 setup and verification

1. Apply `supabase/migrations/202610230003_phase2_sources_campaigns.sql` after the two earlier migrations.
2. Run `npm run seed:content` locally after `seed:demo`. It signs in as each workspace's real manager/creator, publishes six fictional SampleCo sources and saves the original 30-day/50%-savings draft. It preserves existing publications and campaigns on rerun; it does not reset used workspaces. This is setup data, not a canned check result.
3. Run `npm run test:rules`, `npm run test:permissions`, and `npm run check`. The extended permission group checks manager-only publication, 30/31 source limits, creator-only saves, 1,500/1,501-word limits, stale saves, cross-workspace denial and preservation of old snapshots. These real-data assertions remain pending until the project is configured.
4. In the deployed browser, change a manager source and publish, switch to creator, save/reload a campaign revision and inspect old versions. Attempt invalid dates/limits and denied roles. Keep the Phase 2 gate open until these results are recorded. No approval or AI result is produced by this phase.

The API derives workspace/user scope from the active lease and validated Auth identity. Published source rows and saved copy rows have no direct client mutation grants. The save/publication functions validate permissions and expected versions in the database; saves update the same campaign row used by the planned Phase 4 approval function. A failed network response asks the user to load latest before retrying, because a committed save may outlive a lost response.

## Scope and decisions

- Phase 1/3 will provide pre-provisioned sandboxes and enforce **5 AI attempts per lease on the free tier**, across all three roles. Failed calls and explicit retries count. The previously agreed 15 attempts are an option only after paid access and sufficient global headroom are configured. This limit is not yet enforced by the Phase 0 shell, which exposes no public AI endpoint. Configure the global allowance from the project's actual quota before opening the interactive demo.
- Approval starts with a campaign-row `SELECT ... FOR UPDATE` inside the approve function; saves/review mutations coordinate on that row. Source-version validity is still checked separately. Implementation belongs to Phase 4.
- If behind schedule: defer clarification features first; then reduce the issue table to deduplicated counts. Mark R10 Partial and disclose cuts. Preserve normal review comments and the core workflow.
- Round 3 starts with a PDF-extraction spike on Vercel, since PDF review and guideline import share it.
- The implementation plan is kept in `docs/ROUND2_BUILD_PLAN.md`.

## Development history and disclosure

OpenAI Codex assisted with planning and generated this initial implementation, migration, scripts and documentation. Vaibhav is responsible for reviewing, understanding and validating the code. The Round 1 proposal also attributed research assistance to Claude; that is not a claim of Claude-generated Round 2 code.

This is a fresh implementation using Next.js, React, Supabase, Zod and their standard APIs. No purchased UI template or previous finished product was used. Dependency versions/licences are recorded in the lockfile/package metadata. Significant new reused components must be added to this disclosure. Keep small, factual, unsquashed commits during the build window.

## Reference documentation

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Gemini generateContent API](https://ai.google.dev/api/generate-content)
- [Gemini billing controls](https://ai.google.dev/gemini-api/docs/billing)
- [Gemini data-use terms](https://ai.google.dev/gemini-api/terms)
- [Postgres row locks](https://www.postgresql.org/docs/current/explicit-locking.html)
