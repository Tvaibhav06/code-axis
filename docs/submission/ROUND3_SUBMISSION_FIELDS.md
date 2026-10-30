# CodeAxis Round 3 Submission Fields (Final)

Prepared for **DIZZY DEV** (Solo participant: Vaibhav Tandon, 24ucc077@lnmiit.ac.in, The LNM Institute of Information Technology, Jaipur).

Form Link: **https://forms.gle/FxhT5Z1NupvGTGSw6**  
Submission Window: **27 October 11:59 PM to 30 October 11:59 PM (72 Hours)**

---

## 1. Team Details

- **Hackathon:** CodeAxis
- **Team Name:** DIZZY DEV
- **Participant:** Vaibhav Tandon (Solo)
- **Email:** 24ucc077@lnmiit.ac.in
- **Institution:** The LNM Institute of Information Technology, Jaipur

---

## 2. Final Working Project Link

```
https://brand-review-desk.vercel.app/
```

**Judge Walkthrough Note:**
Judges do not need to register or configure accounts. Clicking **"Start demo"** on the home page automatically allocates an isolated sandbox workspace from a pre-provisioned demo pool. The workspace is seeded with the SampleCo scenario (approved 14-day trial vs 30-day draft conflict). You can switch between **Creator**, **Manager**, and **Reviewer** using the role selector at the top of the desk.

---

## 3. Final Source-Code Repository

```
https://github.com/Tvaibhav06/code-axis
```

- **Branch:** `main`
- Contains complete application source, SQL migrations, manual test fixtures (`docs/manual-fixtures/`), test suites, deployment configs for both Vercel and Render.com, and an evergreen README.

---

## 4. Final Product PDF / Document

- **PDF File:** `docs/submission/DIZZY_DEV_CodeAxis_Round3.pdf`
- **Editable Document (Word):** `docs/submission/DIZZY_DEV_CodeAxis_Round3.docx`

---

## 5. Complete List of Features Built

Brand Review Desk implements an automated, human-in-the-loop brand governance and compliance pre-flight platform for marketing campaigns:

1. **Pre-Provisioned Multi-Role Workspaces:** Separate authenticated Creator, Manager, and Reviewer identities with strict workspace isolation enforced by Supabase Auth and Postgres Row Level Security (RLS).
2. **Versioned Brand Rulebooks:** Managers publish immutable snapshots of brand guidelines, approved facts, terminology aliases, logo assets, and color palettes.
3. **Numbered Campaign Revisions:** Creators maintain campaign copy, purpose, and audience, creating immutable version records on every save with diff tracking.
4. **Image OCR Text Extraction (Round 3):** Server-side Tesseract.js OCR extracts text inside PNG/JPG images, providing an editable confirmation preview and checking image claims against the rulebook.
5. **Cross-Modal Consistency Checking (Round 3):** Automatically detects discrepancies when body copy and image banners contradict one another (e.g., body copy says 30 days while image text says 14 days).
6. **Short PDF Brief Ingestion (Round 3):** Multi-page PDF brief review (up to 5 pages, 2 MB, 1,500 words) with page-mapped text extraction, preview, and rule checking citing exact page numbers.
7. **Manager Guideline Import from PDF (Round 3):** Automatically extracts proposed brand facts from PDF briefs with anti-hallucination verbatim span matching; managers review, edit, and publish new versioned rulebooks.
8. **Dual Check Engine:** Fast deterministic TypeScript rules paired with optional Google Gemini 2.5 Flash REST calls using strict Zod structured outputs citing quoted spans and source IDs.
9. **Interactive Human Review Desk:** Reviewers log notes, resolve/dismiss blockers, request clarifications, and verify visual contrast and design checklists.
10. **Cryptographic Approval Transaction:** SQL row-level locking binds approval to the specific content revision, published rulebook version, and check run; automatically invalidates if copy or brand rules change.
11. **Self-Contained Audit Handoff:** Exportable, escaped HTML review package containing timestamped approval signatures, complete diff histories, and rule citations.

---

## 6. Technical Architecture & Implementation Summary

- **Frontend & App Shell:** Next.js 16.4.2 (App Router), React 19, TypeScript 5.9. Server-rendered pages with fast client hydration for responsive interactive editing.
- **Backend & Database:** Supabase Postgres with custom Row Level Security (RLS) policies. Sensitive operations (approval locking, asset registration, slot claims) run in transactional Postgres PL/pgSQL security-definer functions.
- **Private Asset Storage:** Supabase Storage buckets (`brand-assets`, `brand-documents`) with zero public access. Images and PDFs are validated and uploaded server-side and served through short-lived signed URLs.
- **Image Validation & OCR:** Sharp enforces pixel limits (4,096px per side, 16MP) and file signatures. Tesseract.js handles optical character recognition with pre-processed buffers.
- **PDF Extraction Engine:** Server-side dynamic imports of `pdfjs-dist` and `pdf-parse` extract per-page text streams without client bundle overhead.
- **AI Integration:** Server-side native REST calls to Gemini with Zod validation. Fails open cleanly to deterministic rule checking if provider rate limits or 503s occur.
- **Deployment:** Vercel edge infrastructure and containerized Render.com (Node 22 engine).

---

## 7. Improvements Completed After Round 2 (Including the Three Named)

During the 72-hour Round 3 window, we delivered exactly the three promised improvements plus critical reliability hardening:

### The Three Committed Improvements:
1. **Review Text Inside Images (OCR):**
   - Implemented Tesseract.js OCR for PNG/JPG files up to 5 MB.
   - Built the human confirmation preview interface in the campaign editor.
   - Wired cross-modal check logic detecting contradictions between copy and image text.
   - Verified 10/10 passing fixtures on the OCR evaluation benchmark.
2. **Review Short Text PDFs:**
   - Engineered native PDF stream parsing for multi-page documents (up to 5 pages, 2 MB, 1,500 words).
   - Generated per-page text maps (`Page 1`, `Page 2`) and incorporated page-level citations in review findings.
   - Hardened rejection paths for encrypted PDFs, scanned non-text files, and oversized documents.
3. **Import Guidelines with Manager Confirmation:**
   - Implemented candidate rule/fact extraction from uploaded PDF briefs.
   - Added anti-hallucination guard verifying every candidate is a verbatim substring of the PDF.
   - Built manager UI to review, edit, discard, and publish extracted rules, incrementing rulebook versions and invalidating prior approvals.

### Post-Round 2 Reliability & Usability Hardening:
- **Atomic Server-Side Uploads:** Re-architected `/api/assets/upload` and `/api/assets/upload-pdf` to eliminate client-side browser storage CORS and network fetch errors.
- **Network Timeout Expansion:** Increased timeout signals to 30,000 ms across `supabase.ts`, `proxy.ts`, and `demo.ts` to withstand trans-continental network latency.
- **Concurrency Locks:** Added immediate synchronous busy locks on demo start, role switching, and version saves to eliminate double-click race conditions.
- **Demo Pool Recycling:** Added `recycle_expired_demo_slots` migration to automatically recycle claimed demo workspaces whose leases expired.

---

## 8. Testing Details & Verified Evidence

- **Automated Rule & Unit Tests (`npm run test:rules`):**
  - **67 / 67 passing tests** across 6 test suites:
    - `ocr-fixtures.test.ts`: 10/10 OCR benchmark fixtures passed.
    - `pdf-extract.test.ts`: 11/11 document extraction and boundary rejection tests passed.
    - `conflicts.test.ts`: 2/2 version conflict tests passed.
    - `checks.test.ts`: 9/9 rule engine checks passed.
    - `content-inputs.test.ts`: 21/21 input boundary tests passed.
    - `images-handoff.test.ts`: 19/19 image contrast, alt-text, and handoff tests passed.
- **Permission & RLS Security Suite (`npm run test:permissions`):**
  - Real-account Supabase tests verifying that cross-workspace access is denied (42501), reviewer cannot tamper with drafts, historical approvals remain immutable, and private storage is protected. Zero failures.
- **TypeScript & Production Build Verification:**
  - `npm run typecheck`: 0 errors.
  - `npm run build`: 100% clean optimized production webpack build.

---

## 9. Product Roadmap & Future Development Plan

### Milestone 1: Multi-Tenant Enterprise Workspaces & Custom Brand Portals (Q1 2027)
- **Self-Service Company Instances:** Organizations can register dedicated company workspaces with custom subdomains (e.g., `review.brand.com`) and enterprise SSO (SAML/Okta).
- **Multi-Campaign Architecture:** Support multiple concurrent campaign tracks, product lines, and sub-brands under unified organizational guidelines.
- **Granular Role-Based Access:** Specialized roles for External Creative Agencies, Legal Directors, and Compliance Auditors.

### Milestone 2: Enterprise AI Headroom & Multi-Model Resilience (Q2 2027)
- **Dedicated Enterprise AI Key & Higher Rate Limits:** Provision dedicated enterprise-tier API keys (Vertex AI / Gemini Paid Tier) with guaranteed throughput SLAs and high concurrency headroom.
- **Multi-Model Fallback Mesh:** Automatic failover across independent frontier models (Gemini 2.5 Flash &rarr; Claude 3.5 Sonnet &rarr; GPT-4o) when provider latency exceeds 5 seconds.
- **Adaptive Brand Learning:** Fine-tune embeddings on historical reviewer feedback to catch subtle nuances in brand tone and style.

### Milestone 3: Expanded Ingestion & Direct Marketing Integrations (Q3 2027)
- **DOCX & Creative Ingestion:** Extend file ingestion to parse Microsoft Word (`.docx`) briefs and Figma design frames.
- **Direct Publishing Webhooks:** Export cryptographically approved review bundles directly to CMS platforms (Contentful, WordPress) and ad networks (Google Ads, Meta Ads Manager) upon final approval.
- **Multilingual Compliance:** Expand OCR and rule checks to multilingual global campaigns (Spanish, German, French, Hindi, Japanese).

---

## 10. Authorship Disclosure & Attribution

DIZZY DEV is a solo participant project by **Vaibhav Tandon** (B.Tech, The LNM Institute of Information Technology, Jaipur). In accordance with event guidelines, extensive AI assistance from OpenAI Codex and Google DeepMind's Antigravity coding agents is openly disclosed for code generation, migration scripts, and documentation support. All architectural decisions, security boundaries, debugging, and verification were directed and validated by the author.

