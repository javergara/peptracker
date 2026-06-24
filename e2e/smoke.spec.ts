import { expect, test } from "@playwright/test";

/**
 * Data-driven smoke test: exercises the main navigation and confirms seeded
 * content renders. Kept resilient to markup changes by asserting on visible
 * domain text rather than specific selectors.
 */

test("dashboard loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/not medical advice/i).first()).toBeVisible();
});

test("peptides knowledge base lists seeded peptides", async ({ page }) => {
  await page.goto("/peptides");
  await expect(page.getByText(/Retatrutide/i).first()).toBeVisible();
  await expect(page.getByText(/Tesamorelin/i).first()).toBeVisible();
});

test("peptide detail page renders", async ({ page }) => {
  await page.goto("/peptides/retatrutide");
  await expect(
    page.getByRole("heading", { name: /Retatrutide/i }),
  ).toBeVisible();
  // Cited references live behind the "References" tab.
  await page.getByRole("tab", { name: /references/i }).click();
  await expect(page.getByText(/NEJM|Lancet|Nature|PMC/i).first()).toBeVisible();
});

test("wolverine preset stack is present", async ({ page }) => {
  await page.goto("/stacks/wolverine");
  await expect(page.getByText(/BPC-?157/i).first()).toBeVisible();
  await expect(page.getByText(/TB-?500/i).first()).toBeVisible();
});

test("suggestions page loads", async ({ page }) => {
  await page.goto("/suggestions");
  await expect(page.getByText(/not medical advice/i).first()).toBeVisible();
});

test("calendar view loads", async ({ page }) => {
  await page.goto("/calendar");
  await expect(
    page.getByRole("heading", { name: /^Calendar$/i }),
  ).toBeVisible();
  // The month grid renders weekday headers.
  await expect(page.getByText("Mon").first()).toBeVisible();
});

test("profile switcher and management are present", async ({ page }) => {
  await page.goto("/");
  // Active profile shown in the sidebar switcher.
  await expect(page.getByText("Me").first()).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByText("Profiles").first()).toBeVisible();
  await expect(page.getByPlaceholder("New profile name")).toBeVisible();
});

test("switching profiles works", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Me/ }).first().click();
  await page.getByRole("button", { name: "Partner" }).click();
  await expect(page.getByRole("button", { name: /^Partner/ })).toBeVisible();
});

test("calendar has a per-day quick-log control", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page.getByRole("button", { name: /^Log$/ })).toBeVisible();
});

test("calendar all-profiles overlay shows every profile", async ({ page }) => {
  await page.goto("/calendar");
  await page.getByRole("link", { name: "All profiles" }).click();
  await expect(page).toHaveURL(/view=all/);
  // Legend lists both seeded profiles.
  await expect(page.getByText("Me").first()).toBeVisible();
  await expect(page.getByText("Partner").first()).toBeVisible();
});

test("inventory page shows the seeded vial", async ({ page }) => {
  await page.goto("/inventory");
  await expect(page.getByRole("heading", { name: /Inventory/i })).toBeVisible();
  // Seeded vial label (distinct from the hidden select <option>).
  await expect(page.getByText(/Tesamorelin 10mg/i).first()).toBeVisible();
});

test("labs page shows the seeded marker", async ({ page }) => {
  await page.goto("/labs");
  await expect(page.getByText(/IGF-1/i).first()).toBeVisible();
});

test("photos page loads with an upload control", async ({ page }) => {
  await page.goto("/photos");
  await expect(page.getByRole("heading", { name: /Photos/i })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toBeAttached();
});

test("dashboard shows adherence widget", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/adherence/i).first()).toBeVisible();
});

test("nav is grouped with new sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Tracking").first()).toBeVisible();
  await expect(page.getByText("Health").first()).toBeVisible();
});
