import type { SourceEntry } from "./content-schema";
import { aiOutputSchema, type Finding } from "./review-schema";

export function sourceCurrent(source: SourceEntry, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return (!source.validFrom || source.validFrom <= day) && (!source.validUntil || source.validUntil >= day);
}
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function literalMatches(body: string, value: string) {
  return Array.from(body.matchAll(new RegExp(`(?:^|[^\\p{L}\\p{N}_])(${escapeRegex(value)})(?=$|[^\\p{L}\\p{N}_])`, "giu")), (match) => match[1]);
}

export function assignFindingPages(findings: Finding[], pages: { num: number; text: string }[] = []): Finding[] {
  return findings.map((f) => {
    if (!pages.length) return { ...f, page: null };
    const matched = pages.find((p) => p.text.includes(f.quote));
    return { ...f, page: matched ? matched.num : null };
  });
}

export function exactChecks(body: string, sources: SourceEntry[], pages: { num: number; text: string }[] = []) {
  const findings: Finding[] = [];
  const supported = new Set<string>();
  function add(rule: SourceEntry, category: Finding["category"], quote: string, explanation: string, suggestion: string | null) {
    if (!findings.some((finding) => finding.ruleId === rule.id && finding.category === category && finding.quote === quote)) {
      const matchedPage = pages.find((p) => p.text.includes(quote));
      findings.push({
        id: crypto.randomUUID(),
        ruleId: rule.id,
        category,
        quote,
        explanation,
        suggestion,
        origin: "exact",
        blocking: category !== "style_suggestion",
        page: matchedPage ? matchedPage.num : null,
      });
    }
  }
  for (const source of sources) {
    let quotes: { quote: string; value?: number }[] = [];
    if (source.kind === "terminology") {
      quotes = [...source.aliases.flatMap((alias) => literalMatches(body, alias)), ...literalMatches(body, source.value)].map((quote) => ({ quote }));
    } else if (source.kind === "trial_days") {
      const patterns = [/\b(?:free\s+(?:for\s+)?|trial\s+(?:(?:for|of|lasts|is)\s+)?)(\d{1,5})[\s-]*days?\b/gi,
        /\b(\d{1,5})[\s-]*days?\s+(?:free|trial)\b/gi];
      quotes = patterns.flatMap((pattern) => Array.from(body.matchAll(pattern), (match) => ({ quote: match[0], value: Number(match[1]) })));
    } else if (source.kind === "monthly_price") {
      quotes = Array.from(body.matchAll(/(?:₹\s*|INR\s*|Rs\.?\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:\/\s*(?:month|mo)\b|per\s+month\b|a\s+month\b)/gi), (match) => ({ quote: match[0], value: Number(match[1].replaceAll(",", "")) }));
    } else if (source.kind === "offer") quotes = literalMatches(body, source.value).map((quote) => ({ quote }));
    else quotes = [{ quote: body.slice(0, Math.min(body.length, 180)) }];
    if (!quotes.length) continue;
    supported.add(source.id);
    for (const item of quotes) {
      if (!sourceCurrent(source)) {
        add(source, "evidence_missing", item.quote, `The supporting source “${source.title}” is outside its validity dates. Ask the manager for current support.`, null);
      } else if (source.kind === "terminology" && item.quote.toLocaleLowerCase() !== source.value.toLocaleLowerCase()) {
        add(source, "source_conflict", item.quote, `The approved brand name is ${source.value}.`, source.value);
      } else if (item.value !== undefined && item.value !== Number(source.value)) {
        add(source, "source_conflict", item.quote, `The approved ${source.kind === "trial_days" ? "trial duration" : "monthly INR price"} is ${source.value}.`,
          source.kind === "trial_days" ? item.quote.replace(/\d+/, source.value) : item.quote.replace(/\d+(?:,\d{3})*(?:\.\d{1,2})?/, source.value));
      }
    }
  }
  return { findings, supportedSourceIds: [...supported] };
}

export function validateAiFindings(output: unknown, body: string, sources: SourceEntry[], pages: { num: number; text: string }[] = []): Finding[] {
  const parsed = aiOutputSchema.parse(output);
  return parsed.findings.map((finding) => {
    if (!sources.some((source) => source.id === finding.ruleId) || !body.includes(finding.quote)) throw new Error("Invalid source or quote");
    const matchedPage = pages.find((p) => p.text.includes(finding.quote));
    return {
      ...finding,
      id: crypto.randomUUID(),
      origin: "ai",
      blocking: finding.category !== "style_suggestion",
      page: matchedPage ? matchedPage.num : null,
    };
  });
}

export function applyLiteralSuggestion(body: string, quote: string, suggestion: string) {
  const index = body.indexOf(quote);
  if (!quote || index < 0) throw new Error("The quoted text is no longer present.");
  return body.slice(0, index) + suggestion + body.slice(index + quote.length);
}
