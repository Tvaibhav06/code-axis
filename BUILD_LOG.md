# Build log

## Phase 0 — started 23 October 2026 (Asia/Kolkata)

**Status: Shell ready for Vercel import; Phase 0 service/deployment gate remains open.** No later phase is marked complete.

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
- No service secrets were supplied. Supabase migration/test-account access, Gemini model access and deployed runtime remain unverified. Missing configuration is reported as blocked by the smoke runner.
- Vercel import is the owner's next setup step; no public deployment has been verified.

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
