import "server-only";
import { guidelineImportSchema, type GuidelineCandidate } from "../lib/guideline-schema";
import { DemoError, requireDemoContext } from "./demo";
import { createDemoAdminClient } from "./supabase";

type Context = Awaited<ReturnType<typeof requireDemoContext>>;

// Extract guideline candidates from a validated document.
export async function extractGuidelineCandidates(context: Context, path: string): Promise<GuidelineCandidate[]> {
  const admin = createDemoAdminClient();
  const doc = await admin.from("validated_documents").select("*").eq("path", path).eq("workspace_id", context.lease.workspace_id).single();
  if (doc.error || !doc.data) throw new DemoError(400, "The validated document could not be found.");
  const pages = doc.data.page_map as { num: number; text: string }[];
  const fullText = pages.map((p) => p.text).join("\n");
  if (!fullText.trim()) throw new DemoError(400, "The document contains no selectable text.");

  // Candidate extraction: the manager can review these. Each candidate must be a
  // verbatim substring of the extracted text so invented passages cannot be
  // smuggled through. The extraction logic is deliberately simple and conservative.
  const candidates: GuidelineCandidate[] = [];
  const lines = fullText.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  // 1. Terminology: lines that look like "X is the approved name" or "Use X"
  for (const line of lines) {
    const m = line.match(/^(?:the\s+)?(?:approved\s+)?(?:brand\s+)?(?:name|term)\s+(?:is|must\s+be)\s+["']?([^"'.]+)["']?\.?$/i);
    if (m) {
      const value = m[1].trim();
      if (value.length >= 1 && value.length <= 500) {
        candidates.push({
          kind: "terminology",
          title: `Terminology from document`,
          value,
          owner: "Document extract",
          source: `Page ${pages.find((p) => p.text.includes(line))?.num || 1}`,
          validFrom: null,
          validUntil: null,
          aliases: [],
          quotedSpan: line,
          sourcePage: pages.find((p) => p.text.includes(line))?.num || 1,
        });
      }
    }
  }

  // 2. Trial days: "14 days" or "X days free" or "trial (?:of|for|lasts) X days"
  for (const page of pages) {
    const m = page.text.match(/(?:trial|free)\s*(?:for\s*)?(\d{1,3})\s*days?/i);
    if (m) {
      candidates.push({
        kind: "trial_days",
        title: "Trial duration from document",
        value: m[1],
        owner: "Document extract",
        source: `Page ${page.num}`,
        validFrom: null,
        validUntil: null,
        aliases: [],
        quotedSpan: m[0],
        sourcePage: page.num,
      });
    }
  }

  // 3. Monthly price: INR/₹ patterns
  for (const page of pages) {
    const matches = page.text.matchAll(/(?:₹|INR|Rs\.?)\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:\/month|per\s+month|a\s+month)/gi);
    for (const m of matches) {
      candidates.push({
        kind: "monthly_price",
        title: "Monthly price from document",
        value: m[1].replaceAll(",", ""),
        owner: "Document extract",
        source: `Page ${page.num}`,
        validFrom: null,
        validUntil: null,
        aliases: [],
        quotedSpan: m[0],
        sourcePage: page.num,
      });
    }
  }

  // 4. Tone guidance
  for (const line of lines) {
    if (/^(?:use|write|keep|avoid|tone|style|voice|language)/i.test(line) && line.length >= 10 && line.length <= 500) {
      candidates.push({
        kind: "tone",
        title: "Tone guidance from document",
        value: line,
        owner: "Document extract",
        source: `Page ${pages.find((p) => p.text.includes(line))?.num || 1}`,
        validFrom: null,
        validUntil: null,
        aliases: [],
        quotedSpan: line,
        sourcePage: pages.find((p) => p.text.includes(line))?.num || 1,
      });
    }
  }

  // 5. Evidence requirement
  for (const line of lines) {
    if (/(?:numerical|performance|savings|claim|evidence|proof|source|study)/i.test(line) && line.length >= 10 && line.length <= 500) {
      candidates.push({
        kind: "evidence",
        title: "Evidence requirement from document",
        value: line,
        owner: "Document extract",
        source: `Page ${pages.find((p) => p.text.includes(line))?.num || 1}`,
        validFrom: null,
        validUntil: null,
        aliases: [],
        quotedSpan: line,
        sourcePage: pages.find((p) => p.text.includes(line))?.num || 1,
      });
    }
  }

  // 6. Offer codes
  for (const page of pages) {
    const matches = page.text.matchAll(/\b[A-Z]{3,10}\d{0,4}\b/g);
    for (const m of matches) {
      if (m[0].length >= 3 && m[0].length <= 20) {
        candidates.push({
          kind: "offer",
          title: "Offer code from document",
          value: m[0],
          owner: "Document extract",
          source: `Page ${page.num}`,
          validFrom: null,
          validUntil: null,
          aliases: [],
          quotedSpan: m[0],
          sourcePage: page.num,
        });
      }
    }
  }

  // De-duplicate by quotedSpan + kind, cap at 10
  const unique = candidates.filter((c, i, arr) => arr.findIndex((x) => x.kind === c.kind && x.quotedSpan === c.quotedSpan) === i);
  return unique.slice(0, 10);
}

export async function importGuidelines(context: Context, input: unknown) {
  if (context.role !== "manager") throw new DemoError(403, "Only the manager can import guidelines.");
  const parsed = guidelineImportSchema.safeParse(input);
  if (!parsed.success) throw new DemoError(400, parsed.error.issues[0]?.message || "Check the import fields.");
  const { path, candidates } = parsed.data;

  // Every quotedSpan must be an exact substring of the validated document text.
  const admin = createDemoAdminClient();
  const doc = await admin.from("validated_documents").select("extracted_text").eq("path", path).eq("workspace_id", context.lease.workspace_id).single();
  if (doc.error || !doc.data) throw new DemoError(400, "The validated document could not be found.");
  const fullText = doc.data.extracted_text;
  for (const c of candidates) {
    if (!fullText.includes(c.quotedSpan)) {
      throw new DemoError(400, `Candidate quote not found in the document: “${c.quotedSpan}”. Invented passages are not allowed.`);
    }
  }

  // Convert candidates to the source entry schema expected by publish_brand_sources
  const entries = candidates.map((c) => ({
    id: crypto.randomUUID(),
    kind: c.kind,
    title: c.title,
    value: c.value,
    owner: c.owner,
    source: c.source,
    validFrom: c.validFrom,
    validUntil: c.validUntil,
    aliases: c.aliases,
    sourceDoc: path,
    quotedSpan: c.quotedSpan,
  }));

  // The manager still presses "Publish" in the UI, so this function just validates
  // and returns the converted entries for the editor to populate the draft.
  return { entries };
}