import { test, expect } from "@playwright/test";

test("redirects / to /load and shows header", async ({ page }) => {
  await page.goto("/");

  // Verify redirect to /load (path-based or hash-based)
  await expect(page).toHaveURL(/\/load/);

  // Verify the load screen container is visible
  await expect(page.getByTestId("load-screen")).toBeVisible();

  // Verify the shared-ui Header is rendered (contains FluffyLabs logo image)
  await expect(page.getByAltText("FluffyLabs logo")).toBeVisible();
});
