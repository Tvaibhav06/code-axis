# Brand Review Desk

Brand Review Desk helps a marketing team check campaign content against approved facts, guidelines and assets before publication. Creators get specific feedback, make corrections and send a saved revision to a separate reviewer. The final decision stays with a person.

For example, SampleCo offers a **14-day trial**, but a draft promises **30 days**. The app identifies the conflict, points to the approved fact and suggests a correction. Approval belongs to the version that was reviewed, so later edits cannot silently reuse it.

**[Open the live demo](https://brand-review-desk.vercel.app/)** · **[Browse the source](https://github.com/Tvaibhav06/code-axis)**

[Workflow](#workflow) · [Architecture](#architecture) · [Data model](#data-model) · [Run locally](#run-locally) · [Testing](#testing) · [Known limitations](#known-limitations)

## What the app supports

| Area | Capability |
|---|---|
| Approved sources | Versioned guidelines, facts, terminology, owners, references, validity dates, logo and palette |
| Campaigns | Purpose, audience, English copy, numbered revisions and an optional private image |
| Explainable checks | Supported terminology/fact checks and optional AI findings with quoted text and source references |
| Human review | Comments, clarification, reasoned decisions, submission and independent approval |
| Approval safeguards | Content/source/run binding, unresolved-blocker gates, relevant expiry checks and stale-export rejection |
| Image review | Validated uploads, alt text, manual visual checks and contrast for a selected colour pair |
| History and handoff | Paged revision history, deduplicated issue counts and a downloadable HTML review record |

The demo and AI integrations have [known limitations](#known-limitations). A successful build or homepage response does not establish that a deployed review journey passes end to end.

## Roles

| Role | Responsibilities |
|---|---|
| Creator | Save drafts, run checks, apply chosen corrections and submit revisions |
| Manager | Publish approved sources/assets and answer clarification requests |
| Reviewer | Inspect submitted content, resolve findings, request changes and approve independently |

The demo uses separate authenticated accounts for these roles. Role checks are enforced on the server and in database functions, not just by hiding interface controls.

## Workflow

Checks always use saved copy and a published source snapshot. An AI request is optional; an incomplete response requires explicit manual review rather than being treated as a clean result.

```mermaid
flowchart TD
    Sources[Manager publishes sources] --> Draft[Creator saves a revision]
    Draft --> Checks[Exact checks and optional AI review]
    Checks --> Findings[Quoted findings and suggested corrections]
    Findings -->|Ready for review| Submit[Submit the checked revision]
    Submit --> Review[Independent reviewer resolves blockers and required checks]
    Review -->|Requirements met| Approve[Approve these snapshots]
    Approve --> Export[Revalidate and download HTML]
    Approve -->|Content or sources change, or support expires| Historical[Previous approval becomes historical]
    Findings -->|Revise| Draft
    Review -->|Changes needed| Draft
    Historical --> Draft
```

Suggestions do not overwrite copy automatically. A creator chooses a correction and saves a new revision. Clarification notes also do not change approved facts; managers must publish an updated source snapshot for that.

## Architecture

The interface, server-rendered workspace and API routes live in one Next.js application. Protected requests validate the active identity, demo lease and workspace role. Ordinary product reads/writes use the signed-in user's Supabase permissions.

```mermaid
flowchart TD
    Browser[Browser and React interface]
    Auth[Supabase Auth]
    DB[(Postgres, RLS and SQL functions)]
    Storage[(Private Supabase Storage)]
    Gemini[Gemini API]

    subgraph App[Next.js application]
        Entry[Server pages and API routes]
        Access[Identity, lease and role checks]
        Services[Content and review services]
        Rules[Exact rule engine]
        AI[AI adapter and Zod validation]
        Images[Sharp image validation]
        Export[Approval check and HTML export]
        Entry --> Access --> Services
        Services --> Rules
        Services --> AI
        Services --> Images
        Services --> Export
    end

    Browser --> Entry
    Access <--> Auth
    Access -->|Resolve lease and membership| DB
    Services <--> DB
    Browser -->|Authenticated direct image upload| Storage
    Images -->|Download and decode| Storage
    Images -->|Register trusted metadata| DB
    AI <-->|Saved text and approved sources| Gemini
    Export -->|Recompute approval eligibility| DB
    Export -->|Escaped HTML record| Browser
```

| Component | Technology |
|---|---|
| Application | Next.js App Router, React, TypeScript and Node.js |
| Identity and data | Supabase Auth, Postgres and Row Level Security |
| Files | Private Supabase Storage and Sharp |
| Review | TypeScript exact rules, Gemini REST API and Zod |
| Hosting | Vercel |
| Verification | Vitest, real-account permission checks and Playwright |

Dependency versions are pinned in [package.json](package.json) and [package-lock.json](package-lock.json). The project requires Node.js 22 as declared in its engine settings.

Trusted server access is restricted to demo allocation, recording validated check results and registering decoded assets after access checks. The browser cannot forge trusted AI results or image-validation metadata. Server keys and the private account manifest never belong in client code.

## Data model

The diagrams show the principal tables and selected columns. They omit some repeated user/workspace foreign keys for readability. `auth_users` represents Supabase's `auth.users`; application tables are in the `public` schema.

### Content and workspace access

```mermaid
erDiagram
    auth_users ||--o{ workspace_members : has_memberships
    workspaces ||--o{ workspace_members : has_members
    workspaces ||..o{ rulebooks : stores
    workspaces ||..o{ campaigns : contains
    campaigns ||..o{ campaign_versions : has_revisions
    auth_users ||..o{ campaigns : creates
    workspaces ||..o{ validated_assets : owns
    auth_users ||..o{ validated_assets : uploads

    auth_users {
        uuid id PK
    }
    workspaces {
        uuid id PK
        text name
        integer rulebook_version
    }
    workspace_members {
        uuid workspace_id PK, FK
        uuid user_id PK, FK
        text role
    }
    rulebooks {
        uuid id PK
        uuid workspace_id FK
        integer version
        jsonb entries
        text logo_path
        jsonb palette
    }
    campaigns {
        uuid id PK
        uuid workspace_id FK
        uuid creator_id FK
        integer current_version
        text status
    }
    campaign_versions {
        uuid id PK
        uuid campaign_id FK
        integer version
        text body
        text image_path
        text alt_text
    }
    validated_assets {
        text path PK
        uuid workspace_id FK
        uuid owner_id FK
        text mime
        text sha256
    }
```

Each rulebook is an immutable publication. Individual source entries live inside `rulebooks.entries` as JSON, not in a separate sources table. `logo_path` and `image_path` are checked storage-path references, not SQL foreign keys to `validated_assets`.

### Checks, decisions and approval

```mermaid
erDiagram
    campaign_versions ||..o{ check_runs : checked_in
    rulebooks ||..o{ check_runs : provides_sources
    check_runs ||..o{ findings : produces
    campaign_versions ||..o{ review_events : discussed_in
    findings |o..o{ review_events : referenced_by
    campaign_versions ||..o{ approvals : approved_snapshot
    rulebooks ||..o{ approvals : source_snapshot
    check_runs ||..o{ approvals : check_snapshot

    campaign_versions {
        uuid id PK
        uuid campaign_id FK
        integer version
    }
    rulebooks {
        uuid id PK
        uuid workspace_id FK
        jsonb entries
    }
    check_runs {
        uuid id PK
        uuid content_version_id FK
        uuid rulebook_id FK
        text status
        jsonb supported_source_ids
    }
    findings {
        uuid id PK
        uuid run_id FK
        uuid rule_id
        text category
        boolean blocking
    }
    review_events {
        uuid id PK
        uuid content_version_id FK
        uuid finding_id FK
        text event_type
        text note
    }
    approvals {
        uuid id PK
        uuid content_version_id FK
        uuid rulebook_id FK
        uuid run_id FK
        uuid reviewer_id FK
        text review_mode
    }
```

`review_events.finding_id` is nullable because comments and submissions need not target a finding. A finding's `rule_id` identifies a JSON source entry and is validated against its run's rulebook; it is not a foreign key to a separate rule table. Demo slots, leases and allowance settings live in `brd_private` and are excluded from these product diagrams. See [SQL migrations](supabase/migrations) for the complete constraints and policies.

## Approval safeguards

An approval records the content revision, rulebook and check run that were reviewed. The database locks the campaign row while checking eligibility, preventing an approval from silently carrying over to a concurrently saved revision.

```mermaid
sequenceDiagram
    actor Creator
    actor Reviewer
    participant App as Next.js server
    participant DB as Postgres

    Creator->>App: Save revision and run checks
    App->>DB: Store version, check run and findings
    DB-->>App: Saved snapshot identifiers
    Creator->>App: Submit saved revision
    App->>DB: Record submission
    Reviewer->>App: Approve expected snapshots and checklist
    App->>DB: approve_campaign
    Note over DB: Lock row and verify approval requirements
    alt State changed or requirements unmet
        DB-->>App: Reject approval
        App-->>Reviewer: Explain conflict or missing review
    else Current and eligible
        DB-->>App: Record approval
        App-->>Reviewer: Display approval for saved version
    end
    opt Creator saves another revision
        Creator->>App: Save updated content
        App->>DB: Store new immutable revision
    end
    Reviewer->>App: Download approved record
    App->>DB: Check approval before and after HTML assembly
    alt Approval still current
        App-->>Reviewer: Download HTML record
    else Snapshot changed or support expired
        App-->>Reviewer: Reject stale export and require review
    end
```

The actual checks also enforce independent review, resolved blocking findings and required manual/image checklists. Relevant source expiry is evaluated when approval state is computed. Historical approvals remain readable; they are not proof that the current campaign is approved.

## Use the deployed demo

Open [Brand Review Desk](https://brand-review-desk.vercel.app/) and select **Start demo**. Signup is not required. Each session receives an isolated fictional workspace. Keep the same browser session while exploring; another private session consumes another demo slot.

1. As **Creator**, open the seeded campaign and choose **Run checks**, leaving **Include a real AI check** off.
2. Inspect the 30-day trial conflict and its approved 14-day source.
3. Replace the copy with `Try SampleCo free for 14 days.`, save the new version and run checks again.
4. Add a note and choose **Submit saved version for review**.
5. Switch to **Reviewer** and wait for the role change to finish. Inspect the saved copy/sources, complete the required manual checks and approve.
6. Download the HTML record. Return to Creator, edit and save; the old approval should become historical.

Managers can publish sources, logos and palettes or answer clarification requests. Image review also requires alternative text, explicit manual checks and suitable contrast for the selected colour pair. See [manual verification guidance](docs/LOCAL_RUN_AND_MANUAL_VERIFICATION.md) for additional cases.

**Known demo issue:** role switching can stall at **Updating your sign-in…**. This has interrupted a deployed review journey. Do not assume the new role or an action completed while the interface remains pending. Reloading is a troubleshooting step, not a verified recovery guarantee.

## Run locally

### Prerequisites and installation

- Node.js 22 and npm.
- A Supabase project with the application migrations applied.
- Internet access: a local Next.js process still uses remote Supabase services.
- Gemini credentials only if you deliberately enable real AI checks.

```bash
git clone https://github.com/Tvaibhav06/code-axis.git
cd code-axis
npm ci
```

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if script execution policy blocks `npm` or `npx`.

### Configure services

If this checkout is already configured, preserve its `.env.local`, account manifest and usage counters. Do not rerun schema creation or recreate accounts simply to start the app.

For a new development project:

1. Copy `.env.example` to `.env.local` only if the latter does not exist. Enter your Supabase URL, publishable key and server-only service-role/secret key.
2. Apply the files in [supabase/migrations](supabase/migrations) once, in filename order. Apply only missing migrations to an existing database.
3. Keep demo entry and AI disabled during setup. A small **new** pool can use `DEMO_POOL_SIZE=2`, `DEMO_AI_ATTEMPT_LIMIT=5`, `GLOBAL_AI_ATTEMPT_LIMIT=0`, `GEMINI_BILLING_TIER=free` and `AI_CHECKS_ENABLED=false`.
4. Run `npm run seed:demo`, followed by `npm run seed:content`. These write real fictional accounts/content to your configured Supabase project. The account manifest and verification credentials are saved privately in `.env.local`.
5. Set `DEMO_ACCESS_ENABLED=true` and `NEXT_PUBLIC_SITE_URL=http://localhost:3137`.

The pool also includes two dedicated verification workspaces. Do not shrink an existing pool, replace a manifest or reset consumed allowance while configuring a checkout.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only trusted operations and setup |
| `DEMO_POOL_ACCOUNTS_JSON` | Generated private demo-account manifest |
| `DEMO_ACCESS_ENABLED`, `DEMO_POOL_SIZE` | Demo entry and pool configuration |
| `DEMO_AI_ATTEMPT_LIMIT`, `GLOBAL_AI_ATTEMPT_LIMIT` | Database-backed application allowances |
| `AI_CHECKS_ENABLED` | Server switch for real AI requests |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | Optional Gemini credentials and model identifiers |
| `GEMINI_BILLING_TIER` | Intended service tier; does not change provider billing |
| `NEXT_PUBLIC_SITE_URL` | Local or deployed app origin |

Never add a `NEXT_PUBLIC_` prefix to server keys or the account manifest. Changing an allowance in a file does not reset usage or automatically update the database setting. Use the setup script intentionally and preserve existing consumption.

### Start the app

After configuration, use PowerShell to start without provider calls:

```powershell
$env:AI_CHECKS_ENABLED = 'false'
npm.cmd run dev -- --port 3137
```

Wait for **Ready**, then open [http://localhost:3137](http://localhost:3137/). Use `localhost` consistently. The terminal override keeps real AI off even if saved settings enable it.

If the port is occupied, stop the earlier server or use another port consistently in the app URL, site setting and browser-test base URL. For a local production build, stop the dev server and run:

```powershell
npm.cmd run build
npm.cmd run start -- --port 3137
```

## Testing

### Rules and code quality

```bash
npm run test:rules
npm run lint
npm run typecheck
npm run build
```

These checks need no Gemini requests. Stop the dev server before building so both processes do not share an output directory. A passing build does not establish that external services or the deployed workflow are healthy.

### Database and storage permissions

With migrations and verification accounts configured:

```bash
npm run test:permissions
npm run smoke:services -- supabase
```

These use real Supabase Auth, database and private Storage. The permission suite writes fictional fixtures in dedicated verification workspaces. Its labelled manual fixtures are not AI accuracy evidence.

### Browser journey

Start the app, then use a second PowerShell terminal:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = '.cache/pw-browsers'
npx.cmd playwright install chromium
$env:PHASE6_BASE_URL = 'http://localhost:3137'
$env:PHASE6_AI = 'false'
$env:PHASE6_IMAGES = 'true'
$env:PHASE6_ALLOWANCE_EXHAUSTED = 'false'
npm.cmd run test:browser
```

The journey exercises source/image publication, saved checks, decisions, clarification, approval, actual HTML download, history and invalidation. It allocates a fresh demo workspace and uses real Supabase services. AI-off mode makes no provider calls.

To target the deployed app, set `PHASE6_BASE_URL=https://brand-review-desk.vercel.app` instead. A local server is unnecessary for that run. Check available demo capacity before repeated public runs; used sessions are not automatically recycled.

### Live AI evaluation

`npm run pilot` runs the fixed development cases and makes real provider requests. Primary/fallback smoke modes also call Gemini. Check both provider quota and application headroom before running them; diagnostic scripts must not be used to bypass the application's allowance.

Record failures and unavailable cases separately from successful responses. Exact-rule recovery on an AI failure is not an AI pass. Detailed prior runs and limitations are available under [verification notes](docs/PHASE6_VERIFICATION.md) and [evidence](docs/evidence).

## Deployment

1. Connect the repository to Vercel with Next.js, Node 22 and the repository root as Root Directory. Configure the intended production branch.
2. Add your environment variables to Production. Keep the service-role key, Gemini key and demo-account manifest secret. Git does not copy `.env.local` to the host.
3. Set `NEXT_PUBLIC_SITE_URL` to the actual HTTPS deployment origin. Enable demo entry only after setup is complete. Preserve the manifest, database usage and configured allowances.
4. Deploy the reviewed commit. Environment changes require a new deployment. Check the source revision and build logs.
5. Verify the public walkthrough while signed out, including the actual download and approval invalidation. A Ready deployment is only a successful build.

`/api/health` checks the application shell, not database, storage or AI readiness. See [Vercel Git deployments](https://vercel.com/docs/git) and [environment-variable management](https://vercel.com/docs/environment-variables/managing-environment-variables).

## AI behavior and privacy

Model identifiers are configuration values in `.env.local` or the hosting environment. If primary and fallback identifiers match, there is no independent fallback. Responses must pass structural, quoted-span and source-ID validation before storage. The request timeout is 25 seconds; there is no automatic retry or model switch.

Per-session and global allowance checks happen before a product AI request. Failed provider attempts and explicit retries count after reservation. A global limit of zero disables product AI calls. Limits are cumulative application controls, not provider billing caps or automatic daily resets.

The text-only Gemini request receives saved copy and approved source entries. Original images remain in private Storage. Free-tier inputs and responses may be used by Google to improve its products, so the public demo accepts fictional data only. See [Gemini's data-use terms](https://ai.google.dev/gemini-api/terms). Handling confidential customer material requires a separate provider and retention review.

## Known limitations

- **Demo role transitions can stall.** A Manager-to-Creator switch has remained pending long enough to interrupt public testing. Reliable recovery and a complete deployed pass remain unverified.
- **AI availability is not guaranteed.** Quota exhaustion and provider 503 errors have interrupted evaluation. The existing pilot does not establish general model accuracy.
- **Visual checks are partly manual.** No image OCR, automatic logo recognition or whole-image accessibility assessment is implemented. Contrast applies to the selected colour pair.
- **Input scope is bounded.** Pasted English copy up to 1,500 words, up to 30 source entries and one PNG/JPG up to 5,242,880 bytes, 4,096 pixels per side and 16 megapixels.
- **Documents and publishing are unsupported.** PDF/DOCX parsing and automatic campaign publication are not implemented.
- **Demo capacity is finite.** Used slots are not automatically recycled. Failed/abandoned uploads may remain unreferenced in private Storage; there is no background cleanup service.
- **Verification is incomplete.** A real product-timeout check and unassisted usability evaluation remain open. Historical local checks are not a guarantee of hosted behavior.

## Planned extensions

- **Image text review:** extract readable English from a PNG/JPG, let the creator correct/confirm it and check the resulting claims against approved sources.
- **Short PDF review:** preview and review private text PDFs with page references and bounded file/page/word limits.
- **Confirmed guideline import:** propose source-backed rules from a document, with manager editing and explicit publication before they become authoritative.

These are planned capabilities, not available features. DOCX import and publishing integrations are additional possibilities after the review workflow is validated.

## Project structure

```text
src/app/                Pages and API route handlers
src/components/         Workspace, review and upload interfaces
src/lib/                Schemas, pure checks and shared helpers
src/server/             Access control, data access and integrations
supabase/migrations/    Tables, policies and transactional functions
scripts/                Setup and service/permission verification
tests/unit/             Rule, input and image/export tests
tests/browser/          Playwright workflow verification
docs/                   Setup, testing and design notes
```

OpenAI Codex assisted development and generated substantial application code, SQL migrations, tests, scripts and documentation. Gemini is the optional AI integration within the product. The implementation uses standard framework scaffolding, the listed libraries and fictional development fixtures. Preserve dependency licences and review generated code alongside other contributions.
