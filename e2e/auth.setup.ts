import { test as setup, expect } from "@playwright/test";

/**
 * Logs in once with the seeded demo account and saves the session so the rest of
 * the suite runs authenticated (the app gates every route behind login).
 * Override the credentials with E2E_EMAIL / E2E_PASSWORD env vars if needed.
 */
const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page
    .getByLabel(/email/i)
    .fill(process.env.E2E_EMAIL ?? "local@peptides.app");
  await page
    .getByLabel(/password/i)
    .fill(process.env.E2E_PASSWORD ?? "peptides123");
  await page.getByRole("button", { name: /log in/i }).click();

  await page.waitForURL("/");
  await expect(page.getByText(/not medical advice/i).first()).toBeVisible();

  await page.context().storageState({ path: authFile });
});
