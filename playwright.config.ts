import { defineConfig } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const downloadsPath = resolve(".cache/browser-downloads");
mkdirSync(downloadsPath, { recursive: true });
export default defineConfig({
  testDir: "./tests/browser", workers: 1, retries: 0, timeout: 480_000,
  expect: { timeout: 35_000 }, reporter: "list",
  use: { baseURL: process.env.PHASE6_BASE_URL || "http://localhost:3137", browserName: "chromium",
    acceptDownloads: true, launchOptions: { downloadsPath },
    viewport: { width: 1280, height: 850 }, trace: "off", video: "off", screenshot: "off" },
});
