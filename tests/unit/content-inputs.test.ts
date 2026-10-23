import { describe, expect, it } from "vitest";
import { campaignSchema, publishSourcesSchema, saveCampaignSchema, sourceEntrySchema, wordCount } from "../../src/lib/content-schema";
import { samplecoDraft, samplecoSources } from "../../src/lib/sampleco";

const campaignId = "00000000-0000-4000-8000-000000000100";
const creatorId = "00000000-0000-4000-8000-000000000101";
const draft = { campaignId: null, expectedVersion: 0, ...samplecoDraft };
const entries = (count: number) => Array.from({ length: count }, (_, index) => ({ ...samplecoSources[4],
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` }));

describe("Source publication boundaries", () => {
  it("accepts 30 distinct sources", () => {
    expect(publishSourcesSchema.safeParse({ expectedVersion: 0, entries: entries(30) }).success).toBe(true);
  });
  it("rejects a 31st source", () => {
    expect(publishSourcesSchema.safeParse({ expectedVersion: 0, entries: entries(31) }).success).toBe(false);
  });
  it("rejects duplicate source identities", () => {
    expect(publishSourcesSchema.safeParse({ expectedVersion: 0, entries: [samplecoSources[0], samplecoSources[0]] }).success).toBe(false);
  });
  it.each(["owner", "source"] as const)("requires an actual %s label", (field) => {
    expect(sourceEntrySchema.safeParse({ ...samplecoSources[0], [field]: "   " }).success).toBe(false);
  });
  it("rejects a validity window ending before it starts", () => {
    expect(sourceEntrySchema.safeParse({ ...samplecoSources[3], validFrom: "2026-10-25", validUntil: "2026-10-01" }).success).toBe(false);
  });
  it("allows a past end date so expiry can be checked honestly", () => {
    expect(sourceEntrySchema.safeParse(samplecoSources[3]).success).toBe(true);
  });
  it.each(["0", "-1", "14.5", "1000001", "₹499"])("rejects malformed or unsupported numeric value %s", (value) => {
    expect(sourceEntrySchema.safeParse({ ...samplecoSources[1], value }).success).toBe(false);
  });
  it("rejects caller-supplied workspace scope", () => {
    expect(publishSourcesSchema.safeParse({ expectedVersion: 0, entries: samplecoSources, workspaceId: campaignId }).success).toBe(false);
  });
});

describe("Campaign input and snapshot boundaries", () => {
  it("counts words across spaces, tabs and newlines", () => {
    expect(wordCount(" \nSampleCo\ttrial  \n ")).toBe(2);
    expect(wordCount(" \n\t")).toBe(0);
  });
  it("accepts exactly 1,500 words without changing the copy", () => {
    const body = Array(1500).fill("sample").join(" ");
    expect(saveCampaignSchema.parse({ ...draft, body }).body).toBe(body);
  });
  it("rejects 1,501 words", () => {
    expect(saveCampaignSchema.safeParse({ ...draft, body: Array(1501).fill("sample").join(" ") }).success).toBe(false);
  });
  it("rejects an empty campaign", () => {
    expect(saveCampaignSchema.safeParse({ ...draft, body: " \n " }).success).toBe(false);
  });
  it("rejects caller-supplied creator identity", () => {
    expect(saveCampaignSchema.safeParse({ ...draft, creatorId }).success).toBe(false);
  });
  it("rejects a campaign whose current revision is missing", () => {
    expect(campaignSchema.safeParse({ id: campaignId, creator_id: creatorId, current_version: 2, status: "draft", campaign_versions: [] }).success).toBe(false);
  });
});
