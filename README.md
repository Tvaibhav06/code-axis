# Brand Review Desk

A focused CodeAxis project by DIZZY DEV (Vaibhav Tandon). Review campaign content against approved brand sources and keep approval with a human reviewer.

## Current status

Phase 0 foundation. The landing page is an illustrative preview, not a working campaign-review product. Database/Auth, private storage and both Gemini model checks have a real smoke-test path; they must actually pass before Phase 0 is complete. See BUILD_LOG.md for observed results and blockers.

## Local setup

Use Node 22 and npm. Install the pinned dependencies with `npm ci`. Copy `.env.example` to `.env.local`, enter values locally and keep that file out of Git. Start with `npm run dev`.

Checks: `npm run lint`, `npm run typecheck`, `npm run build`.

Install the rule-test and Playwright dependencies when their planned phases begin; Phase 0 does not install unused browser-test frameworks or add empty test suites.

The public `/api/health` endpoint checks the application shell only. It intentionally makes no claim that any external service is connected.

## Real Phase 0 service checks

1. Use a dedicated Supabase project. Apply `supabase/migrations/202610230001_phase0_smoke.sql` in its SQL editor or migration tooling. This creates only an owner-isolated temporary test table and a private PNG test bucket. The application schema belongs to Phase 1.
2. Create one fictional test user in Supabase Auth, with an email/password login. Put the project URL, publishable key and that user's credentials into `.env.local`. These checks never need a service-role key.
3. Add the Gemini API key from your **free-tier** project and keep `GEMINI_BILLING_TIER=free`. Only the fixed fictional SampleCo fixture is sent by these checks. **Google may use free-tier inputs and responses to improve its products.** Never enter confidential, client or personal information. The setting records the intended tier; it cannot inspect or change Google's actual billing. If you later choose paid access, configure its cap in AI Studio before setting `GEMINI_BILLING_TIER=paid`, `GEMINI_PAID_PROJECT_CONFIRMED=true` and `GEMINI_MONTHLY_SPEND_CAP_USD`.
4. Run `npm run smoke:services`. The script uses the real services: authenticated insert/read/delete, private image upload/download/anonymous denial/cleanup, and one structured response from each configured Gemini model. Only sanitised summaries are printed. Missing settings return **blocked** and a failing exit code, never a false pass.
5. For deployed verification, set the same variables in the dedicated Vercel project and set a random `PHASE0_SMOKE_TOKEN` of at least 32 characters. Configure Node 22. Then run `npm run smoke:deployment -- https://your-project.vercel.app` locally. Only the token travels to this protected project endpoint; it reads service credentials from its own server environment.
6. Remove `PHASE0_SMOKE_TOKEN` and the smoke-user password from production settings when setup is finished, then redeploy. This disables the diagnostic route. It is not a public review API and has no public judge call budget.

There is no automatic retry or fallback switch. Both model IDs are configured candidates until their actual calls pass. The single-turn `generateContent` REST API remains supported; using native fetch avoids another SDK dependency. The smoke fixture only verifies structured extraction, not the full review engine's accuracy.

Import [Tvaibhav06/code-axis](https://github.com/Tvaibhav06/code-axis) into Vercel, select Next.js, leave Root Directory at the repository root and use Node 22. Add secrets in Vercel environment variables, never in Git. The shell can build without service keys; service checks will stay blocked until they are configured. After deployment, set `NEXT_PUBLIC_SITE_URL` to its actual HTTPS URL and run the deployed check. A local build or Git push does not verify deployment.

The supplied Supabase project is `https://uyowubvbofkahdoovfxb.supabase.co`. Its URL is public configuration; its publishable key and test-account settings must still be entered locally. No migration has been applied automatically.

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
