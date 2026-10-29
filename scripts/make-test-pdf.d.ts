// Type declaration for the test-fixture PDF generator.
// It is a plain .mjs script, so TypeScript cannot infer its shape from an import.
export function buildPdf(inputPages: readonly (string | string[])[], options?: { userPassword?: string }): string;