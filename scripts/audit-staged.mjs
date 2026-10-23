import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const files = execFileSync("git", ["ls-files", "-z"]).toString().split("\0").filter(Boolean);
const names = ["GEMINI_API_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SMOKE_PASSWORD", "PHASE0_SMOKE_TOKEN", "DEMO_POOL_ACCOUNTS_JSON"];
const secrets = names.map((name) => process.env[name]).filter((value) => value && value.length >= 8);
if (process.env.DEMO_POOL_ACCOUNTS_JSON) {
  const collect = (value) => { if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) { if (key === "password" && typeof child === "string") secrets.push(child); else collect(child); } };
  collect(JSON.parse(process.env.DEMO_POOL_ACCOUNTS_JSON));
}
let failed = false;
for (const file of files) {
  if (/(^|\/)\.env(\.|$)/.test(file) && file !== ".env.example") { console.error(`Forbidden settings file staged: ${file}`); failed = true; }
  const bytes = execFileSync("git", ["show", `:${file}`], { maxBuffer: 20_000_000 });
  if (secrets.some((secret) => bytes.includes(Buffer.from(secret)))) { console.error(`Private setting found in staged file: ${file}`); failed = true; }
}
if (failed) process.exit(1);
console.log(`Staged-secret check passed for ${files.length} files; no private values printed.`);
