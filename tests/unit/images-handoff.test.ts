import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { validateImage } from "../../src/lib/image-validation";
import { MAX_IMAGE_BYTES, contrastRatio } from "../../src/lib/image-schema";
import { saveCampaignSchema, publishSourcesSchema, deskStateSchema } from "../../src/lib/content-schema";
import { issueCounts } from "../../src/lib/insights";
import { handoffHtml, authenticatedCampaignUrl, escapeHtml } from "../../src/lib/handoff";
import { reviewViewSchema } from "../../src/lib/review-schema";
import { samplecoSources } from "../../src/lib/sampleco";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const date = "2026-10-23T10:00:00Z";
const state = deskStateSchema.parse({ rulebookVersion: 1, rulebooks: [{ id: uuid(101), version: 1, entries: samplecoSources, published_at: date, published_by: uuid(102) }], campaigns: [{
 id: uuid(103), creator_id: uuid(104), current_version: 1, status: "approved", campaign_versions: [{ id: uuid(105), campaign_id: uuid(103), version: 1,
 title: "SampleCo <script>alert(1)</script>", purpose: "Fictional test", audience: "Reviewers", body: "Try SampleCo free for 14 days. <img src=x onerror=alert(1)>", created_at: date }],
}] });
const review = reviewViewSchema.parse({ runs: [{ id: uuid(106), campaign_id: uuid(103), content_version_id: uuid(105), rulebook_id: uuid(101), status: "manual", model: null, error_code: null, supported_source_ids: [], created_at: date, findings: [] }], events: [{ id: uuid(108), actor_id: uuid(107), actor_role: "reviewer", content_version_id: uuid(105), event_type: "comment", note: "<script>bad()</script>", finding_id: null, created_at: date }], approval: {
 current: true, reason: "Current", checked_at: date, approval: { id: uuid(109), reviewer_id: uuid(107), approved_at: date, content_version_id: uuid(105), rulebook_id: uuid(101), run_id: uuid(106), review_mode: "manual" },
} });
describe("real image decoding boundaries", () => {
 it("accepts a real PNG without changing its bytes", async () => { const bytes = await sharp({ create: { width: 40, height: 30, channels: 3, background: "white" } }).png().toBuffer(); const copy = Buffer.from(bytes); expect(await validateImage(bytes, "image/png")).toMatchObject({ width: 40, height: 30, bytes: bytes.length }); expect(bytes.equals(copy)).toBe(true); });
 it("accepts a real JPEG", async () => { const bytes = await sharp({ create: { width: 20, height: 10, channels: 3, background: "white" } }).jpeg().toBuffer(); expect((await validateImage(bytes, "image/jpeg")).mime).toBe("image/jpeg"); });
 it("rejects an SVG renamed as PNG", async () => { await expect(validateImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), "image/png")).rejects.toThrow(); });
 it("rejects a mismatched MIME", async () => { const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).png().toBuffer(); await expect(validateImage(bytes, "image/jpeg")).rejects.toThrow(); });
 it("rejects a PNG declaring animation before decoding frames", async () => { const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).png().toBuffer(); const control = Buffer.alloc(20); control.writeUInt32BE(8); control.write("acTL", 4); const declaredAnimated = Buffer.concat([bytes.subarray(0, 8), control, bytes.subarray(8)]); await expect(validateImage(declaredAnimated, "image/png")).rejects.toThrow("still image"); });
 it("rejects a truncated image even with its signature intact", async () => { const bytes = await sharp({ create: { width: 20, height: 20, channels: 3, background: "white" } }).png().toBuffer(); await expect(validateImage(bytes.subarray(0, 45), "image/png")).rejects.toThrow(); });
 it("rejects oversized dimensions", async () => { const bytes = await sharp({ create: { width: 4097, height: 1, channels: 3, background: "white" } }).png().toBuffer(); await expect(validateImage(bytes, "image/png")).rejects.toThrow(); });
 it("accepts a valid image of exactly 5 MB and rejects one extra byte", async () => { const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } }).jpeg().toBuffer(); const padded = Buffer.concat([bytes, Buffer.alloc(MAX_IMAGE_BYTES - bytes.length)]); expect((await validateImage(padded, "image/jpeg")).bytes).toBe(MAX_IMAGE_BYTES); await expect(validateImage(Buffer.concat([padded, Buffer.from([0])]), "image/jpeg")).rejects.toThrow(); });
});
describe("contrast and saved image fields", () => {
 it("calculates black/white and identical colours", () => { expect(contrastRatio("#000000", "#ffffff")).toBe(21); expect(contrastRatio("#ffffff", "#ffffff")).toBe(1); });
 it("rejects malformed colours", () => { expect(() => contrastRatio("red", "#ffffff")).toThrow(); });
 it("keeps image checks attached to a revision", () => { const v = state.campaigns[0].campaign_versions[0]; const base = { campaignId: uuid(103), expectedVersion: 1, title: v.title, purpose: v.purpose, audience: v.audience, body: v.body }; expect(saveCampaignSchema.safeParse({ ...base, imagePath: "https://public.example/image.png" }).success).toBe(false); expect(saveCampaignSchema.safeParse({ ...base, altText: "x".repeat(501) }).success).toBe(false); });
 it("rejects a seventh palette colour", () => { expect(publishSourcesSchema.safeParse({ expectedVersion: 1, entries: samplecoSources, palette: Array(7).fill("#ffffff") }).success).toBe(false); });
});
describe("deduplicated issue history", () => {
 it("counts repeated runs once per campaign and rule", () => { const d = { id: "a", findingId: "f1", campaignId: "c1", ruleId: "r1", decision: "confirm" as const, createdAt: date }; expect(issueCounts([d, { ...d, id: "b", findingId: "f2" }, { ...d, id: "c", findingId: "f3", campaignId: "c2" }])).toEqual([{ ruleId: "r1", confirmed: 2, disputed: 0 }]); });
 it("uses the latest decision and removes dismissed false alarms", () => { const d = { id: "a", findingId: "f1", campaignId: "c1", ruleId: "r1", decision: "confirm" as const, createdAt: date }; expect(issueCounts([d, { ...d, id: "b", decision: "dispute" }])[0].disputed).toBe(1); expect(issueCounts([d, { ...d, id: "b", decision: "dismiss" }])).toEqual([]); });
 it("does not erase a different confirmed issue when dismissing a false alarm", () => { const d = { id: "a", findingId: "f1", campaignId: "c1", ruleId: "r1", decision: "confirm" as const, createdAt: date }; expect(issueCounts([d, { ...d, id: "b", findingId: "f2", decision: "dismiss" }])).toEqual([{ ruleId: "r1", confirmed: 1, disputed: 0 }]); });
});
describe("escaped approved handoff", () => {
 it("escapes copy, titles and comments and includes actual review mode", () => { const html = handoffHtml(state, uuid(103), review, "https://brand-review-desk.vercel.app"); expect(html).not.toContain("<script>"); expect(html).not.toContain("<img src=x"); expect(html).toContain("&lt;script&gt;"); expect(html).toContain("manual"); expect(html).toContain("Content-Security-Policy"); });
 it("rejects a historical or mismatched approved snapshot", () => { expect(() => handoffHtml(state, uuid(103), { ...review, approval: { ...review.approval!, current: false } }, "https://example.com")).toThrow(); expect(() => handoffHtml({ ...state, rulebookVersion: 2 }, uuid(103), review, "https://example.com")).toThrow(); });
 it("never creates javascript or credential-bearing links", () => { expect(() => authenticatedCampaignUrl("javascript:alert(1)", uuid(103))).toThrow(); expect(() => authenticatedCampaignUrl("https://user:password@example.com", uuid(103))).toThrow(); expect(authenticatedCampaignUrl("https://example.com/anything", uuid(103))).toBe(`https://example.com/desk?campaign=${uuid(103)}`); });
 it("escapes quotes in attributes", () => { expect(escapeHtml('" onmouseover="bad()')).toBe("&quot; onmouseover=&quot;bad()"); });
});
