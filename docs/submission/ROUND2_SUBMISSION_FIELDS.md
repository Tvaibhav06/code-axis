# CodeAxis Round 2 submission fields

Prepared 24 October 2026 for DIZZY DEV. Copy the relevant sections into the organiser's actual form. The public homepage returned HTTP 200 with Start demo present, the repository opened publicly, and GitHub main was confirmed at `ec75539`. Local evidence is recorded against that code baseline; a fresh public workflow check is still required. This file does not claim that a form has been submitted.

## Team details

- Hackathon: CodeAxis
- Team name: DIZZY DEV
- Team leader and only participant: Vaibhav Tandon
- Email: 24ucc077@lnmiit.ac.in
- Team size: 1
- Institute: The LNM Institute of Information Technology, Jaipur

Use the email above only if it matches the registration. Product roles use separate demo accounts and are not additional participants.

## 1 Working project link

https://brand-review-desk.vercel.app/

Judge entry: select Start demo. The fictional SampleCo workspace contains approved sources and a seeded campaign. Creator, Manager and Reviewer are separate role identities available through the demo role selector. The latest public end-to-end check must be completed before submission. If AI is disabled or unavailable, the app requires a recorded manual review.

## 2 Source code repository link

https://github.com/Tvaibhav06/code-axis

The local verification baseline is commit `ec75539`, which includes bounded screen reads and on-demand history. GitHub main was confirmed at that commit. Confirm the Vercel deployment's source revision separately. The repository contains source, SQL migrations, dependency lockfile, local setup instructions, tests and sanitised evidence. Credentials and account manifests stay out of Git.

## 3 Updated project PDF

Submit `DIZZY_DEV_CodeAxis_Round2.pdf` from this folder. The editable counterpart is `DIZZY_DEV_CodeAxis_Round2.docx`.

The report covers the problem and users, working journey, completed features, implementation choices, progress and changes from Round 1, testing, limitations, team contribution, AI/reuse disclosure and exactly three Round 3 commitments.

Follow the actual Round 2 form's delivery method. If it asks for a Google Drive link, upload the PDF, set Anyone with the link to Viewer, and open that exact link in an incognito window before submitting. Do not substitute a local path for a public document link. No new mandatory filename or page-count rule was identified in the supplied Round 2 instructions.

## 4 List of completed features

Brand Review Desk implements the complete saved-copy review loop: versioned brand rules and facts; separate creator, manager and reviewer identities; numbered content revisions; exact terminology and supported fact checks; source-linked explanations and optional real Gemini suggestions; comments, reasoned decisions and clarification notes; independent human approval; approval invalidation after content/source changes or relevant expiry; and a downloadable HTML review record.

The image path supports one privately stored PNG/JPG, validated file decoding, alternative text, manual visual checks and selected foreground/background contrast. Recurring issue counts are deduplicated from reviewer decisions. Recent records load first, with older source, content, check and decision histories available on demand.

The local manual/image workflow, approval, actual file download, permission controls and history paging passed. Real AI integration is implemented and an earlier one-call browser journey passed, but provider availability and pilot accuracy remain inconclusive. Image OCR, PDF/DOCX parsing, automatic logo recognition and publishing integrations are not implemented in Round 2.

## 5 Technology and implementation details

The application uses Next.js 16.4.2, React 19.3.1, TypeScript 5.9.3 and Node 22. Supabase provides Auth, Postgres, Row Level Security and private Storage. One application keeps the solo build manageable; separate identities and database policies enforce role and workspace boundaries.

Exact checks run in TypeScript. Optional Gemini requests use native server-side REST fetch with Zod output validation, exact quoted spans and known source IDs. The current configured model is gemini-3.6-flash. Primary and fallback settings match, so they do not provide independent model redundancy. Requests time out after 25 seconds, are not automatically retried, and remain incomplete when the provider fails. Manual facts/claims/tone checks are then required before independent approval.

The approval function locks the campaign row and verifies the submitted content revision, current source snapshot, latest run, reviewer identity, unresolved blockers, expiry and required checklists. Approval is recomputed on load and export. Content and source snapshots remain immutable, and a stale export is rejected.

Sharp checks image bytes, dimensions and full decoding after direct private upload. The server registers validated metadata rather than trusting browser claims. The screen reads bounded recent history; export pages through the full trail. Vercel hosts the app. Vitest, a real-account permission script and Playwright provide the three test groups.

Current limits are 30 source entries, 1,500 English words, one image up to 5,242,880 bytes and five AI attempts per session under a cumulative app cap of 22. Google quota applies separately. The demo uses fictional SampleCo fixtures and no external customer dataset.

## 6 Changes from the original plan

The SampleCo 14-versus-30-day example and the text/image review workflow are retained. Export is one HTML record, with original images remaining private in the app. Explicit foreground/background selection and contrast calculation replace the proposed Canvas colour sampler. Demo access uses pre-provisioned isolated workspaces rather than signup or runtime account creation.

The planned 24-draft evaluation moves to Round 3. The Round 2 ten-draft development pilot preserves and discloses all provider failures. The configured model changed after real service checks. Document support remains future work: Round 3 targets short text PDFs and manager-confirmed guideline import; DOCX import remains later scope.

Approval invalidation, recurring issues and clarification notes are existing baseline capabilities, not new Round 3 improvements. No agreed feature cut was activated. A later reliability pass added shared desk reads, truthful loading/error states and on-demand history without removing access to older records.

## 7 Three major improvements for Round 3

1. **Review text inside images.** Extract readable English text from one PNG/JPG, show a correction/confirmation preview, and check confirmed image claims against approved sources. Acceptance: key claim extracted correctly in at least eight of ten readable fixtures; a confirmed 30-day image claim conflicts with the 14-day fact; unreadable text requests manual review. Estimated 4 to 6 focused hours.
2. **Review short text PDFs.** Support private text PDFs up to five pages, 2 MB and 1,500 extracted words, with preview, page references and the current review/approval loop. Start with a deployed Vercel extraction spike. Acceptance: no lost or duplicated fixture text; a page 3 issue points to page 3; scans, password-protected and over-limit files show useful errors. Estimated 4 to 5 hours, including the spike.
3. **Import guidelines with manager confirmation.** Reuse PDF extraction to propose up to ten source-backed rule/fact candidates. The manager edits or rejects them, adds ownership/validity metadata and explicitly publishes within the existing 30-entry limit. Acceptance: six known guidelines, invented-passage rejection, one edited and one discarded candidate, selected publication and approval invalidation. Extraction failure creates no approved policy. Estimated 2 to 3 hours after PDF extraction works.

Allow another 4 to 6 hours for a fresh 24-draft evaluation, fixes and documentation. Freeze expected labels before evaluation and report every miss. Testing and bug fixes are not a fourth feature commitment. Estimates depend on service availability and the extraction spike.

## Contribution and significant AI assistance

DIZZY DEV is a solo team. Vaibhav Tandon owns product scope, configuration, review, testing, deployment and submission. OpenAI Codex assisted planning and generated substantial application code, SQL migrations, tests, setup scripts and documentation. Vaibhav is responsible for reviewing, validating and explaining the implementation. Google Gemini is the external AI component inside the product.

Standard Next.js scaffolding and the listed frameworks, libraries and managed APIs are used. Significant components include Supabase, Zod, Sharp, Vitest and Playwright. Dependency licences and genuine development history must be preserved. Do not describe AI-generated code as wholly handwritten.

The free-tier demo sends fictional saved campaign text and approved source entries to Gemini. Google may use unpaid inputs and responses to improve its products. Original images stay in private Supabase Storage and are not sent to the current text-only AI request. Confidential customer use requires a separate provider and retention review. See [Google's Gemini terms](https://ai.google.dev/gemini-api/terms).

## Testing evidence and limits

The latest local release checks passed: 51 unit tests, zero failures in the real Supabase permission suite, lint, TypeScript and a fresh optimized build. The production manual/image browser journey passed in 1.6 minutes, including history paging, approval, actual HTML download and content/source invalidation. An earlier separate one-call live-AI journey also passed.

The first ten-draft pilot completed AI for 4/10 cases; six requests returned 503. The combined exact/AI pipeline identified 4/6 planted issues, with completed AI on only two planted cases. There were zero false alarms among the two clean cases with completed AI; two other clean cases were unavailable. A separate rerun returned four 503 errors and then a quota error, and stopped. These results do not establish the planned accuracy target. An actual product-timeout check, unassisted usability trial and latest public workflow verification remain open.

## Rubric coverage

| Criterion | Marks | Main evidence in the PDF |
|---|---:|---|
| Core workflow | 30 | Page 1 journey and page 2 delivery list |
| Technical depth and reliability | 25 | Page 3 architecture and page 4 measured checks and limits |
| Progress from Round 1 | 20 | Page 2 promise/delivery comparison and explained changes |
| Three meaningful improvements | 15 | Page 5 bounded commitments and acceptance checks |
| Usability | 10 | Page 1 judge walkthrough, labelled roles, explicit recovery and local browser checks |

The mapping helps judges find evidence; it does not predict scores. The official event page is https://wecodecoders.in/events/code-axis. The supplied Round 2 instructions and Inkloom AI problem statement define the submission scope.
