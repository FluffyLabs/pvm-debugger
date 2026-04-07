import { expect, test } from "@playwright/test";

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

  test("clicking a bundled example navigates to the debugger page", async ({
    page,
  }) => {
    await page.goto("/#/load");
    await expect(page.getByTestId("load-page")).toBeVisible();

    // Click the first example card (ADD instruction)
    const firstCard = page.getByTestId("example-card-add");
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Non-SPI programs skip config step and go directly to debugger
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  });

  test("debugger page shows PVM status OK", async ({ page }) => {
    await page.goto("/#/load");
    const firstCard = page.getByTestId("example-card-add");
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Non-SPI programs skip config step and go directly to debugger
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("pvm-status-typeberry")).toBeVisible();
    await expect(page.getByTestId("pvm-status-typeberry")).toHaveText("OK");
  });

  test("loading a JAM SPI example (add.jam) shows OK status", async ({
    page,
  }) => {
    await page.goto("/#/load");
    // WAT category is collapsed by default, expand it
    await page.getByTestId("category-toggle-wat").click();
    const jamCard = page.getByTestId("example-card-add-jam");
    await expect(jamCard).toBeVisible();
    await jamCard.click();

    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId("config-step-load").click();

    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("pvm-status-typeberry")).toHaveText("OK");
  });

  test("/ without a loaded program redirects to /load", async ({ page }) => {
    await page.goto("/#/");
    await expect(page.getByTestId("load-page")).toBeVisible();
    await expect(page).toHaveURL(/\/load/);
  });
});
