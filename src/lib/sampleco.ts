import { sourceEntriesSchema } from "./content-schema";

// Fictional sources, retaining the qualified Round 1 example. Not customer facts.
export const samplecoSources = sourceEntriesSchema.parse([
  { id: "00000000-0000-4000-8000-000000000001", kind: "terminology", title: "Official brand name", value: "SampleCo",
    owner: "SampleCo brand manager", source: "Fictional brand naming guide", validFrom: null, validUntil: null, aliases: ["Sample Corp", "SampleCorp"] },
  { id: "00000000-0000-4000-8000-000000000002", kind: "trial_days", title: "Approved trial duration", value: "14",
    owner: "SampleCo product manager", source: "Fictional trial policy", validFrom: null, validUntil: null, aliases: [] },
  { id: "00000000-0000-4000-8000-000000000003", kind: "monthly_price", title: "Monthly plan price", value: "499",
    owner: "SampleCo product manager", source: "Fictional INR pricing sheet", validFrom: null, validUntil: null, aliases: [] },
  { id: "00000000-0000-4000-8000-000000000004", kind: "offer", title: "Expired OCT10 offer", value: "OCT10",
    owner: "SampleCo marketing manager", source: "Fictional offer calendar", validFrom: "2026-09-01", validUntil: "2026-10-01", aliases: [] },
  { id: "00000000-0000-4000-8000-000000000005", kind: "tone", title: "Respectful language", value: "Use respectful, practical language. Avoid insulting the reader.",
    owner: "SampleCo brand manager", source: "Fictional voice guide", validFrom: null, validUntil: null, aliases: [] },
  { id: "00000000-0000-4000-8000-000000000006", kind: "evidence", title: "Support numerical performance claims", value: "A numerical savings or performance guarantee needs approved supporting evidence. No savings study is approved in this demo.",
    owner: "SampleCo brand manager", source: "Fictional claims policy", validFrom: null, validUntil: null, aliases: [] },
]);

export const samplecoDraft = {
  title: "SampleCo launch", purpose: "Introduce the fictional SampleCo trial", audience: "Small teams exploring SampleCo",
  body: "Try SampleCo: 30 days free with guaranteed 50% savings.",
};
