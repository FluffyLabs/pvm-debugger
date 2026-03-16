import { test, expect } from "@playwright/test";

test.describe("Sprint 01 — App Shell + Routing", () => {
  test("app shell shows header with branding, sidebar, and content area", async ({ page }) => {
    await page.goto("/");

    // Header with FluffyLabs logo
    await expect(page.getByAltText("FluffyLabs logo")).toBeVisible();

    // Sidebar is present (AppsSidebar renders with flex-col and border-r)
    const sidebar = page.locator(".bg-sidebar.flex-col");
    await expect(sidebar).toBeVisible();

    // Content area with load page
    await expect(page.getByTestId("load-page")).toBeVisible();
  });

  test("/ redirects to /load", async ({ page }) => {
    await page.goto("/");

    // DebuggerPage at / redirects to /load
    await expect(page).toHaveURL(/\/load/);
    await expect(page.getByTestId("load-page")).toBeVisible();
  });

  test("/load renders the load page placeholder", async ({ page }) => {
    await page.goto("/#/load");

    await expect(page.getByTestId("load-page")).toBeVisible();
    await expect(page.getByText("Load Program")).toBeVisible();
  });

  test("unknown route /foo redirects to /load", async ({ page }) => {
    await page.goto("/#/foo");

    await expect(page).toHaveURL(/\/load/);
    await expect(page.getByTestId("load-page")).toBeVisible();
  });

  test("sidebar dark-mode toggle is interactive", async ({ page }) => {
    await page.goto("/#/load");

    // The sidebar is the flex-col element with bg-sidebar class
    const sidebar = page.locator(".bg-sidebar.flex-col");
    await expect(sidebar).toBeVisible();

    // The toggle button is within the sidebar, rendered by ToggleDarkModeIcon as a Button
    const toggleButton = sidebar.getByRole("button");
    await expect(toggleButton.first()).toBeVisible();
    await toggleButton.first().click();
  });
});
