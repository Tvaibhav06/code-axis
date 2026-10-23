// Frozen Round 2 development cases from the controlling plan. Not held-out evaluation.
export const pilotCases = [
  { id: "P01", body: "Try SampleCo free for 30 days.", rule: "00000000-0000-4000-8000-000000000002", category: "source_conflict" },
  { id: "P02", body: "SampleCo costs ₹299 per month.", rule: "00000000-0000-4000-8000-000000000003", category: "source_conflict" },
  { id: "P03", body: "Use OCT10 for 10% off today.", rule: "00000000-0000-4000-8000-000000000004", category: "evidence_missing" },
  { id: "P04", body: "Try Sample Corp free for 14 days.", rule: "00000000-0000-4000-8000-000000000001", category: "source_conflict" },
  { id: "P05", body: "SampleCo guarantees 50% less admin work.", rule: "00000000-0000-4000-8000-000000000006", category: "evidence_missing" },
  { id: "P06", body: "Only an idiot would skip SampleCo.", rule: "00000000-0000-4000-8000-000000000005", category: "style_suggestion" },
  { id: "P07", body: "Try SampleCo free for 14 days.", rule: null, category: null },
  { id: "P08", body: "SampleCo costs ₹499 per month.", rule: null, category: null },
  { id: "P09", body: "See whether SampleCo fits your team's needs.", rule: null, category: null },
  { id: "P10", body: "Explore SampleCo, then decide whether it is right for you.", rule: null, category: null },
] as const;
