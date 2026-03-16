import { test, expect } from "@playwright/test";

test.describe("Sprint 02 — Load a Bundled Example", () => {
  test("load page shows at least one example card", async ({ page }) => {
    await page.goto("/#/load");
    await expect(page.getByTestId("load-page")).toBeVisible();
    const exampleList = page.getByTestId("example-list");
    await expect(exampleList).toBeVisible();
    const buttons = exampleList.getByRole("button");
    await expect(buttons.first()).toBeVisible();
    expect(await buttons.count()).toBeGreaterThanOrEqual(1);
  });

  test("clicking a bundled example navigates to the debugger page", async ({ page }) => {
    await page.goto("/#/load");
    await expect(page.getByTestId("load-page")).toBeVisible();

    // Click the first example card (ADD instruction)
    const firstCard = page.getByTestId("example-card-add");
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Should navigate to debugger page
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  });

  test("debugger page shows PVM status OK", async ({ page }) => {
    await page.goto("/#/load");
    const firstCard = page.getByTestId("example-card-add");
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("pvm-status-typeberry")).toBeVisible();
    await expect(page.getByTestId("pvm-status-typeberry")).toHaveText("OK");
  });

  test("/ without a loaded program redirects to /load", async ({ page }) => {
    await page.goto("/#/");
    await expect(page.getByTestId("load-page")).toBeVisible();
    await expect(page).toHaveURL(/\/load/);
  });
});
