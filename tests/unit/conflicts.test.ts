import { describe, expect, it } from "vitest";
import { isVersionConflict } from "../../src/lib/conflicts";
describe("version-conflict responses", () => {
  it("recognises explicit HTTP conflict and the legacy serialization code", () => {
    expect(isVersionConflict("PT409")).toBe(true);
    expect(isVersionConflict("40001")).toBe(true);
  });
  it("does not turn timeouts, permissions or service failures into version conflicts", () => {
    for (const code of [undefined, "", "42501", "P0001", "PT503", "TimeoutError"]) expect(isVersionConflict(code)).toBe(false);
  });
});
