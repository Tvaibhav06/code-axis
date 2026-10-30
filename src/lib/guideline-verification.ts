import type { SourceEntry } from "./content-schema";

export class GuidelineVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuidelineVerificationError";
  }
}

/**
 * Verifies that any imported guideline candidates with a `sourceDoc` and `quotedSpan`
 * have an exact matching quote in the original extracted document text.
 * Intentional manager edits to `entry.value` are allowed and not checked against the text.
 * Missing documents or altered/invented `quotedSpan` strings throw an error.
 */
export function verifySourceQuotes(
  entries: SourceEntry[],
  documentsByPath: Map<string, string>,
): void {
  for (const entry of entries) {
    if (entry.sourceDoc && entry.quotedSpan) {
      const text = documentsByPath.get(entry.sourceDoc);
      if (!text || !text.includes(entry.quotedSpan)) {
        throw new GuidelineVerificationError(
          `The source quote for “${entry.title}” was not found in the original document. Invented quotes are not allowed.`,
        );
      }
    }
  }
}

