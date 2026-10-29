# Round 3 implementation plan

Prepared 28 October 2026 inside the Round 3 window. Read with `ROUND3_AGENT_HANDOFF.md`.
This plan delivers exactly the three commitments carried from the Round 2 submission.
Nothing here is a replacement feature, and no commitment is dropped.

## Audit performed before planning

| Item | Measured state |
| --- | --- |
| Branch / HEAD | `main` at `8b3acca`, equal to `origin/main` |
| Working tree | Round 2 doc edits and submission files present, unstaged. Preserved; not reset or cleaned |
| Deployed app | `https://brand-review-desk.vercel.app/` returns HTTP 200; `/api/health` 200 |
| Deployed revision | **Not verifiable.** The Vercel project API returns `forbidden` without a token, and no `vercel` CLI credential is configured. No claim is made about which commit is live |
| Round 2 submission status | **Unconfirmed.** Repository files are drafts and say so. Only the owner can confirm what was submitted |
| `npm run lint` | Passes |
| `npm run typecheck` | Passes (`next typegen` + `tsc --noEmit`) |
| `npm run test:rules` | Passes; 51 unit tests at the Round 2 baseline |
| Playwright browser | **Not installed** (`~/.cache/ms-playwright` absent) until this pass |
| Local services | Supabase URL, publishable key and service-role key present in the ignored `.env.local`; `DEMO_ACCESS_ENABLED=true`; pool 44 |
| Gemini | `gemini-3.6-flash`, free tier, cumulative app cap 22 with 18 recorded as consumed. **No provider call has been made in Round 3 yet** |
| PDF/OCR libraries | None installed. `pdf-parse@2.4.5` and `tesseract.js@7` are available on the registry |

## Commitment 2 first — the required extraction spike

The handoff makes the Vercel PDF spike the first task because commitments 2 and 3 share it.

**Spike result (local, 28 October 2026):** `pdf-parse@2.4.5` wraps pdf.js, runs in Node
without a browser or a worker thread, and extracted the real five-page Round 2 submission
PDF into correct per-page text (313/336/370/421/372 words, 1812 total, page numbers 1–5
preserved). Peak resident-memory growth for that document was about 20 MB. A 2 MB / five-page
input therefore fits well inside the Vercel Node 22 function limits. `PDFParse.isNodeJS`
is `true` and the library resolves fonts and page boxes without external assets.

Remaining spike risk is the deployed path only: bundling, cold start and function timeout.
Mitigations: `serverExternalPackages: ["pdf-parse", "pdfjs-dist"]`, `runtime = "nodejs"`,
an explicit `maxDuration`, and destroying the parser in a `finally` block so a request cannot
leak the document copy.

**Honest limitation:** the spike is measured locally. A deployed verification needs a push and
a Vercel deployment, which the owner has not authorised. It is recorded as pending, not passed.

## Shared ingestion design

Both new input types funnel into the existing trusted path instead of a parallel one:

1. The browser uploads the original file **directly to private Supabase Storage**, as images
   already do. Bytes never pass through a Vercel request body.
2. The server downloads the object with the user's own RLS-bound session, validates the
   signature and every limit, and extracts text itself. Browser-supplied text, page counts or
   word counts are never trusted.
3. Extraction results are registered by the service-role client in a new `validated_documents`
   table with a SHA-256 digest, page count and word count.
4. A saved campaign revision then carries the document reference and the extracted text, and
   flows through the unchanged `exactChecks` → `record_check_run` → reviewer decisions →
   `approve_campaign` → `approval_state` → HTML export sequence.

## Commitment 2 — review short text PDFs

- **Limits:** 2 MB, five pages, 1,500 extracted words, declared and actual type both
  `application/pdf`, `%PDF` signature required.
- **Rejections** are distinct and useful: over size, over page count, over word count,
  not a PDF, password protected, and no selectable text (scan). A truncated or corrupt
  file reports that it could not be read rather than pretending to be clean.
- **Password protection** is verified against a genuine RC4 standard-security-handler
  fixture, not a fake dictionary. Unit tests assert pdf.js rejects it with a password error.
- **Page references** are kept as a page map of `{num, text}`. A finding's page is derived
  from the offset of its exact quote inside the extracted text, so an issue on page 3 reports
  page 3.
- **Preview** shows per-page extracted text before the revision is saved, so the creator can
  see what will be checked.
- **Migration 008** adds a private `brand-documents` bucket with its own policies,
  the `validated_documents` table, document columns on `campaign_versions`, and replaces
  `save_campaign` to carry the document reference. Existing role checks, row locks,
  version bumps and approval invalidation are untouched.

## Commitment 3 — import guidelines with manager confirmation

- A manager uploads a guidelines PDF; the server extracts text and proposes up to ten
  source-backed rule/fact candidates.
- **Every candidate quote must be an exact substring of the extracted document text.**
  A candidate that is not found is discarded before the manager ever sees it, so invented
  passages cannot be published.
- Candidates are advisory until the manager explicitly publishes: they arrive in the existing
  `SourcesEditor` draft as editable rows, where the manager sets owner, validity dates and
  type, keeps or discards each one, and presses the normal publish button. Publication still
  runs `publish_brand_sources` with `expectedVersion`, still enforces the 30-entry limit, and
  still bumps the rulebook version — which invalidates prior approvals exactly as before.
- **Extraction failure can never publish policy:** no document text means no candidates, and
  publication remains a separate explicit manager action with its own version check.
- Acceptance fixtures: six known SampleCo guidelines recovered, an invented candidate rejected,
  one edited, one discarded, selected publication, and an existing approval shown as historical.

## Commitment 1 — review text inside images

- `tesseract.js` extracts English text from the already-validated private PNG/JPG, server-side.
- The creator sees the recognised lines in an editable preview, corrects them, and confirms.
  **Nothing is checked before confirmation.**
- Confirmed image text is stored in a new `campaign_versions.image_text` column and joined to
  the body for checking, so the 30-day versus approved 14-day conflict is caught by the same
  `exactChecks` code. `record_check_run` is replaced so a finding quote must appear in that
  combined approved text, keeping the trust boundary in SQL.
- An unreadable image reports that manual review is required, leaving the existing manual
  checklist and image blockers exactly as they are.
- Acceptance: key claims correct in at least 8 of 10 readable fixtures, reported honestly with
  the misses counted.

## Main-journey risk to fix before anything else

`Manager → Creator` stalled at "Updating your sign-in…" for over 35 seconds in the recorded
public check. Working hypotheses, in order: no `maxDuration` on `/api/demo/[action]` (the
default function budget on the free plan is short, and a role switch performs sign-out plus
sign-in plus an RLS write); the 35-second browser timeout expiring while the server-side
transition is still running; `router.refresh()` re-rendering `/desk` while the request is
still in flight.

The fix path: reproduce locally against a production build, add an explicit
`maxDuration` and a shorter server-side timeout with a truthful retry state, and confirm the
switch completes and recovers by reload. Until a deployed journey passes, this stays a
disclosed limitation.

## Order of work and acceptance gates

| Step | Gate before moving on |
| --- | --- |
| 1. Role-switch fix | Local production build completes Manager → Creator → Reviewer and recovers from a forced failure |
| 2. Shared document ingestion + migration 008 | Unit tests for all six rejection reasons; typecheck and build pass |
| 3. Commitment 2 review path | A page-3 finding reports page 3; approval and invalidation still work with a document attached |
| 4. Commitment 3 | Candidate validation rejects non-verbatim quotes; publication bumps the rulebook and invalidates approval |
| 5. Commitment 1 | Confirmed-text check catches the 30-day claim; unreadable image asks for manual review |
| 6. 24-draft evaluation | Only if provider quota allows; every failure preserved, nothing relabelled |
| 7. Docs, PDF, form fields | Statements match the shipped revision and the evidence actually recorded |

## Standing rules for this build

- No commit or push to GitHub. The owner has not granted that permission, so work stays in
  the working tree and the report says so.
- No Gemini call until remaining allowance is checked; stop immediately on a quota error.
- No billing change, no allowance reset, no demo-slot recycling.
- Fictional data only. No secrets in logs, docs, client code or commits.
- The README stays evergreen: no team identity, email or event timeline.
- Nothing is described as passed, deployed or submitted without recorded evidence.
