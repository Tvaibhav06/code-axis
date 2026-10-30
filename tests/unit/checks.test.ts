import { describe, it, expect } from "vitest";
import { exactChecks, validateAiFindings, applyLiteralSuggestion } from "../../src/lib/checks";
import { samplecoSources } from "../../src/lib/sampleco";
describe("explainable campaign checks", () => {
 it("catches the original 30 versus 14 day conflict", () => { expect(exactChecks("Try SampleCo: 30 days free.", samplecoSources).findings.some((f) => f.suggestion?.includes("14"))).toBe(true); });
 it("allows the approved trial", () => { expect(exactChecks("SampleCo offers 14 days free.", samplecoSources).findings).toHaveLength(0); });
 it("matches aliases as whole names", () => { expect(exactChecks("SampleCorpse", samplecoSources).findings).toHaveLength(0); expect(exactChecks("Try SampleCorp.", samplecoSources).findings[0].suggestion).toBe("SampleCo"); });
 it("checks INR monthly prices", () => { expect(exactChecks("INR 799/month", samplecoSources).findings[0].suggestion).toBe("INR 499/month"); });
 it("checks decimal and spaced rupee prices", () => { expect(exactChecks("₹ 499.50/month", samplecoSources).findings[0].suggestion).toBe("₹ 499/month"); expect(exactChecks("INR 499.00/month", samplecoSources).findings).toHaveLength(0); });
 it("flags an expired offer only when used", () => { expect(exactChecks("Use OCT10 today.", samplecoSources).findings[0].category).toBe("evidence_missing"); expect(exactChecks("SampleCo", samplecoSources).supportedSourceIds).not.toContain(samplecoSources.find((s) => s.kind === "offer")!.id); });
 it("rejects invented source IDs and quotes", () => { const base = { ruleId: samplecoSources[0].id, category: "style_suggestion", quote: "invented", explanation: "test", suggestion: null }; expect(() => validateAiFindings({ findings: [base] }, "SampleCo", samplecoSources)).toThrow(); expect(() => validateAiFindings({ findings: [{ ...base, ruleId: "fake", quote: "SampleCo" }] }, "SampleCo", samplecoSources)).toThrow(); });
 it("rejects malformed model output", () => { expect(() => validateAiFindings({ findings: "clean" }, "SampleCo", samplecoSources)).toThrow(); });
 it("replaces one literal quote without interpreting replacement syntax", () => { expect(applyLiteralSuggestion("old old", "old", "$&")).toBe("$& old"); expect(() => applyLiteralSuggestion("new", "old", "x")).toThrow(); });
 it("assigns page number to findings based on document pages", () => {
   const pages = [
     { num: 1, text: "Welcome to SampleCorp overview." },
     { num: 2, text: "Pricing is INR 799/month for all users." },
   ];
   const fullBody = "Headline\nWelcome to SampleCorp overview.\nPricing is INR 799/month for all users.\nSign up today for 30 days free!";
   const res = exactChecks(fullBody, samplecoSources, pages);
   const corpFinding = res.findings.find((f) => f.quote === "SampleCorp");
   const priceFinding = res.findings.find((f) => f.quote.includes("799"));
   const trialFinding = res.findings.find((f) => f.quote.includes("30 days"));
   expect(corpFinding?.page).toBe(1);
   expect(priceFinding?.page).toBe(2);
   expect(trialFinding?.page).toBeNull();
 });
});
