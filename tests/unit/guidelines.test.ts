import { describe, it, expect } from "vitest";
import { verifySourceQuotes, GuidelineVerificationError } from "../../src/lib/guideline-verification";
import type { SourceEntry } from "../../src/lib/content-schema";

describe("guideline candidate quote verification", () => {
  const docPath = "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333.pdf";
  const docText = `SampleCo Brand and Campaign Guidelines
The approved brand name is SampleCo.
Free trial for 14 days on all starter subscriptions.
Approved monthly price is INR 499 per month.
Use clear, professional and honest language in all promotional copy.`;

  const documentsByPath = new Map<string, string>([[docPath, docText]]);

  const baseEntry: SourceEntry = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    kind: "trial_days",
    title: "Trial duration",
    value: "14",
    owner: "Brand Team",
    source: "Page 1",
    validFrom: null,
    validUntil: null,
    aliases: [],
    sourceDoc: docPath,
    quotedSpan: "Free trial for 14 days on all starter subscriptions.",
  };

  it("passes verification when candidate quote is present in the document", () => {
    expect(() => verifySourceQuotes([baseEntry], documentsByPath)).not.toThrow();
  });

  it("allows intentional manager edits to rule value while preserving the valid source quote", () => {
    const editedValueEntry: SourceEntry = {
      ...baseEntry,
      value: "14", // remains valid format
      title: "Updated Trial Duration by Manager",
    };
    expect(() => verifySourceQuotes([editedValueEntry], documentsByPath)).not.toThrow();
  });

  it("allows publication when an unwanted candidate is removed from draft entries", () => {
    const otherEntry: SourceEntry = {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      kind: "terminology",
      title: "Brand Name",
      value: "SampleCo",
      owner: "Brand Team",
      source: "Manual entry",
      validFrom: null,
      validUntil: null,
      aliases: [],
    };
    // The candidate was removed, so only manual or other valid entries remain
    expect(() => verifySourceQuotes([otherEntry], documentsByPath)).not.toThrow();
  });

  it("rejects an invented candidate quote that does not exist in the document", () => {
    const inventedEntry: SourceEntry = {
      ...baseEntry,
      quotedSpan: "This passage never existed in the PDF guidelines.",
    };
    expect(() => verifySourceQuotes([inventedEntry], documentsByPath)).toThrow(
      GuidelineVerificationError,
    );
    expect(() => verifySourceQuotes([inventedEntry], documentsByPath)).toThrow(
      /was not found in the original document\. Invented quotes are not allowed\./,
    );
  });

  it("rejects when the referenced source document is not found", () => {
    const missingDocEntry: SourceEntry = {
      ...baseEntry,
      sourceDoc: "99999999-9999-9999-9999-999999999999/88888888-8888-8888-8888-888888888888/77777777-7777-7777-7777-777777777777.pdf",
    };
    expect(() => verifySourceQuotes([missingDocEntry], documentsByPath)).toThrow(
      GuidelineVerificationError,
    );
  });
});

