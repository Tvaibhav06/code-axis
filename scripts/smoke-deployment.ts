import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const target = process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL;
  const token = process.env.PHASE0_SMOKE_TOKEN;
  if (!target || !token) throw new Error("configuration");
  const url = new URL("/api/setup/verify", target);
  if (url.username || url.password || (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("https");
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(185_000), redirect: "error" });
  const data = await response.json();
  // The controlled endpoint returns only sanitised check summaries.
  console.log(JSON.stringify(data, null, 2));
  process.exitCode = response.ok && data.passed === true ? 0 : 1;
}

main().catch(() => { console.error("Deployment check unavailable: verify the HTTPS URL, token, access and timeout. No successful integration is implied."); process.exitCode = 1; });
