import { test, expect } from "@playwright/test";
test("diagnose desk page", async ({ page }) => {
  await page.goto("http://localhost:3137/");
  await page.getByRole("button", { name: "Start demo", exact: true }).click();
  await page.waitForURL(/\/desk/);
  await page.screenshot({ path: "/tmp/desk-loaded.png", fullPage: true });
  const html = await page.content();
  console.log("HAS demo-role:", html.includes("demo-role"));
  console.log("HAS Updating:", html.includes("Updating your sign-in"));
  console.log("HAS inert:", html.includes('inert'));
  console.log("TITLE:", await page.title());
  console.log("BODY:", html.slice(0, 1200));
});
