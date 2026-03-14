import { test, expect } from "@playwright/test";

test("redirects / to /load and shows header", async ({ page }) => {
  await page.goto("/");

  // Verify redirect to /load (HashRouter uses #/load)
  await expect(page).toHaveURL(/.*#\/load/);

  // Verify the load screen is visible
  await expect(page.getByTestId("load-screen")).toBeVisible();

  // Verify the header is visible (shared-ui Header renders an img with alt "FluffyLabs logo")
  const header = page.locator("header, [class*='bg-']").first();
  await expect(header).toBeVisible();
});
