import { loadEnvConfig } from "@next/env";
import { runPhase0Checks } from "../src/server/phase0-checks";

async function main() {
  loadEnvConfig(process.cwd());
  const report = await runPhase0Checks();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed ? 0 : 1;
}

main().catch(() => { console.error("Smoke checks failed before completion; no credentials or raw errors were logged."); process.exitCode = 1; });
