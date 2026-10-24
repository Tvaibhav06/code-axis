# DIZZY DEV Round 2 submission documentation

Prepared 24 October 2026. **Documentation draft, not a completed submission.** The implemented core has local evidence; the conclusive AI pilot, product-timeout check and final public deployment verification remain open. Preserve these qualifications until replaced by actual results. The current evidence baseline is local source revision `adee3e9`.

## Team fields

- Hackathon: CodeAxis
- Team name: DIZZY DEV
- Team leader and sole member: Vaibhav Tandon
- Team leader email: 24ucc077@lnmiit.ac.in, provided it matches registration
- Team size: 1
- Institute: The LNM Institute of Information Technology, Jaipur, as stated in Round 1

## Seven required submission items

| Item | Prepared material | Before final submission |
|---|---|---|
| Working project link | https://brand-review-desk.vercel.app/ | Current URL is the earlier deployment. Publish the reviewed source and verify the full public workflow before calling this the working project |
| Source repository | https://github.com/Tvaibhav06/code-axis | Local changes are ahead of origin; push only when deployment resumes and verify judge access/source revision |
| Updated project PDF | [Project update draft](submission/DIZZY_DEV_CodeAxis_Round2_Project_Update_DRAFT.pdf), with [editable DOCX](submission/DIZZY_DEV_CodeAxis_Round2_Project_Update_DRAFT.docx) | Update results/deployment status, inspect final pages, then upload according to the actual Round 2 form |
| Completed features | PDF page 2 and text below | Keep partial verification clearly labelled; do not describe pending extraction as built |
| Technology and implementation | PDF page 3, README and migrations | Ensure model/configuration matches the deployed release |
| Changes to the original plan | PDF page 5 and text below | Retain the Round 1 scope; disclose simplifications and evaluation deferral |
| Three major Round 3 improvements | PDF page 6 and text below | Exactly three substantial commitments; testing and bug fixes are additional work |

No mandatory Round 2 filename or PDF page count was established from the supplied rules. A clear final filename is `DIZZY_DEV_CodeAxis_Round2.pdf`. The current filename includes DRAFT intentionally. Follow the delivery fields in the actual Round 2 form; do not assume its upload method from the Round 1 form alone. If it requests a Drive link, upload the PDF, set Anyone with the link to Viewer, and test that exact link signed out.

## Suggested completed features field

Brand Review Desk implements one SampleCo workspace per demo session, three separate creator/manager/reviewer identities, published source snapshots, numbered campaign revisions, exact terminology/fact checks, source-linked findings, a real Gemini integration, review comments/decisions, independent approval, approval invalidation, private PNG/JPG upload, manual image checks, selected-pair contrast, deduplicated issue counts and an escaped HTML review record.

Local text/image manual journeys and one later AI-assisted journey passed through actual approval and file download. Real permission checks passed, and 49 rule tests passed. AI integration is partial in reliability: the first ten-case pilot completed only four AI responses; a later rerun stopped on quota after five attempted cases. Neither establishes the planned accuracy target. Clarification/issue features are implemented with narrower verification than the central journey. Deployed release checks and unassisted user testing are still pending. See the measured verification report for exact evidence and limits.

## Judging evidence map

| Criterion | Marks | Evidence in this pack |
|---|---:|---|
| Working core workflow | 30 | PDF pages 1-2; recorded real/manual browser journeys and the step-by-step owner guide |
| Technical depth and reliability | 25 | PDF pages 3-4; actual permissions, immutable versions, row-lock approval, private files and honest provider failures |
| Progress from Round 1 | 20 | PDF pages 2 and 5; R01-R13 mapping and explicit changes |
| Three planned improvements | 15 | PDF page 6; bounded scopes, dependencies and acceptance checks |
| Usability | 10 | Self-service entry/role switch, saved-state messages, keyboard/narrow-screen checks; unassisted trial remains open |

This maps evidence to the supplied rubric; it does not predict scores or claim that open checks passed.

## Suggested technology and implementation field

The app uses Next.js, React and TypeScript in one codebase, with Supabase Auth/Postgres/Row Level Security and private Storage. Exact checks run in TypeScript; Gemini generates structured suggestions validated with Zod, exact quoted spans and existing source IDs. The current model is gemini-3.6-flash. Both configured selectors currently point to that model, so there is no independent fallback redundancy. Sharp validates image signatures, dimensions and full decoding. Images upload directly to private Storage; server finalisation authorises the owner and records validated metadata. Vercel is the deployment target. Vitest, a real-account permission script and one Playwright journey provide the three test groups.

Approvals reference the content version, source version and check run. The database approve function locks the campaign row, checks the independent reviewer and current state, and rejects stale or unresolved work. Loading and export recompute current approval eligibility. AI-off or failed checks need a deliberate manual checklist. Current limits are 30 rules/facts, 1,500 English words, one PNG/JPG up to 5,242,880 bytes and five AI attempts per free-tier session, subject to a shared cumulative cap and Google quota. The environment tier label does not itself change billing.

## Suggested changes from Round 1 field

The SampleCo 14-versus-30-day example and the proposed text/image review loop are retained. Export is one escaped HTML review record; the original image stays private in the app. The proposed Canvas colour sampling was simplified to explicit text/background colour selection plus contrast calculation and manual image review. Demo access uses pre-provisioned isolated workspaces instead of adding signup or runtime account creation. The planned 24-draft evaluation moves to Round 3; Round 2 uses a ten-draft pilot with all failures disclosed. Actual model selection changed after service checks, and free-tier use is disclosed. Document import remains future scope; Round 3 specifically targets short text PDFs, while DOCX remains later work. Approval invalidation and recurring issues belong to the Round 1 baseline and are not relabelled as new Round 3 improvements. No agreed clarification/issue-table cut was activated.

## Three major Round 3 improvements field

1. **Review text inside images.** Extract readable English text from one PNG/JPG, show a correction/confirmation preview, and review the confirmed image claims against the approved sources. Target correct key-claim extraction on at least eight of ten readable fixtures; unreadable content must request manual review.
2. **Review short text PDFs.** Support up to five pages, 2 MB and 1,500 extracted words, with text preview, page references and the existing review/approval workflow. Start Round 3 with a deployed Vercel extraction spike. Reject scans, password-protected and over-limit files clearly; keep originals private.
3. **Import guidelines with manager confirmation.** Reuse PDF extraction to propose up to ten source-backed rule/fact candidates. The manager edits/selects them, adds ownership/validity metadata and explicitly publishes within the existing 30-entry limit. Test correct passages, an edited candidate, a rejected candidate and approval invalidation after publication. Imported text cannot publish itself as policy.

The 24-draft evaluation, reliability fixes and usability work accompany these improvements; they are not a fourth feature commitment.

## Contribution and AI disclosure field

Vaibhav Tandon is the sole participant and owner of the product, configuration, review, testing and submission. OpenAI Codex assisted planning and generated substantial application code, database migrations, tests, setup scripts and documentation. Vaibhav is responsible for reviewing, validating and explaining the implementation. Google Gemini is the product's external AI integration. The current free-tier demo sends fictional campaign text and approved source entries; Google may use unpaid inputs and responses to improve its products. Original images stay in private Supabase Storage and are not sent to the current text-only AI request.

Next.js, React, TypeScript, Supabase, Zod, Sharp, Vitest and Playwright are significant external components. Standard framework scaffolding and managed APIs were used. No prior finished product or purchased UI template was used. Preserve dependency licences and genuine unsquashed Git history. Do not describe AI-generated code as wholly handwritten or claim a review/understanding step that you have not personally completed.

## Final readiness checklist

- [ ] Gemini quota and shared app allowance support the planned test and judge traffic.
- [ ] A conclusive pilot is recorded separately from both earlier reports; misses are disclosed.
- [ ] Product timeout/manual recovery has actual evidence; no simulated success is reported as a provider result.
- [ ] Local rule, permission, lint/typecheck/build and shortest relevant browser checks pass for the chosen release.
- [ ] At least one person tries the public workflow without guidance, if reasonably available; otherwise disclose solo verification.
- [ ] The reviewed source revision is pushed and deployed when deployment resumes.
- [ ] Judges can open the project and repository without access requests and finish the core journey.
- [ ] Private image access, refresh, approval invalidation and actual HTML download work in the release.
- [ ] Adequate unused demo slots remain; no claimed slot has been recycled.
- [ ] The PDF's status, model, feature list, changes and three improvements match that release.
- [ ] Every PDF page/link is inspected after the last edit; the form's exact upload/sharing instructions are followed.
- [ ] All seven items and accurate contribution/AI disclosures are supplied once by the team leader before the organiser's deadline.

## Sources and verification

- [Official CodeAxis page](https://wecodecoders.in/events/code-axis), checked 24 October 2026. Its current page confirms practical workflow, source access, AI disclosure and three substantial improvement commitments. The seven-item Round 2 list and marks were supplied directly by the organiser's instructions in this conversation.
- The provided Inkloom AI problem statement and the qualified Round 1 proposal are the scope baseline.
- [Measured Phase 6 evidence](PHASE6_VERIFICATION.md), [build history](../BUILD_LOG.md) and [local/manual guide](LOCAL_RUN_AND_MANUAL_VERIFICATION.md).

No submission, upload, billing change, push or deployment was performed by preparing this documentation.
