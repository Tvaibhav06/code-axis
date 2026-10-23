import { loadEnvConfig } from "@next/env";
import { runPhase0Checks, smokeScopes } from "../src/server/phase0-checks";

async function main() {
  loadEnvConfig(process.cwd());
  const requested = process.argv[2] || "all";
  const scope = smokeScopes.find((value) => value === requested);
  if (!scope) throw new Error("Choose all, supabase, primary or fallback.");
  const report = await runPhase0Checks(scope);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed ? 0 : 1;
}

main().catch(() => { console.error("Smoke checks failed before completion; no credentials or raw errors were logged."); process.exitCode = 1; });
