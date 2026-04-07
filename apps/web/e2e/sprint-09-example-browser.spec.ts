import { expect, test } from "@playwright/test";

test.describe("Sprint 09 — Full Example Browser", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/load");
    await expect(page.getByTestId("load-page")).toBeVisible();
  });

  test("all six example categories render", async ({ page }) => {
    const categoryIds = [
      "generic",
      "wat",
      "assemblyscript",
      "large",
      "json-test-vectors",
      "traces",
    ];
    for (const id of categoryIds) {
      await expect(page.getByTestId(`example-category-${id}`)).toBeVisible();
    }
  });

  test("categories are collapsible", async ({ page }) => {
    const toggle = page.getByTestId("category-toggle-generic");
    await expect(toggle).toBeVisible();

    // Cards should be visible initially (open by default)
    const card = page.getByTestId("example-card-add");
    await expect(card).toBeVisible();

    // Collapse the category
    await toggle.click();
    await expect(card).not.toBeVisible();

    // Re-expand
    await toggle.click();
    await expect(card).toBeVisible();
  });

  test("clicking a bundled example navigates to the debugger", async ({
    page,
  }) => {
    const card = page.getByTestId("example-card-add");
    await expect(card).toBeVisible();
    await card.click();

    // Non-SPI programs skip config step and go directly to debugger
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  });

  test("remote examples render with format badge", async ({ page }) => {
    // inst-add-64 and riscv-simple are in json-test-vectors (collapsed by default)
    await page.getByTestId("category-toggle-json-test-vectors").click();
    await expect(page.getByTestId("example-card-inst-add-64")).toBeVisible();
    await expect(page.getByTestId("example-card-riscv-simple")).toBeVisible();
    await expect(page.getByTestId("example-format-inst-add-64")).toBeVisible();
  });

  test("format badges are visible on example cards", async ({ page }) => {
    // Check a generic PVM badge (generic is expanded by default)
    const genericBadge = page.getByTestId("example-format-add");
    await expect(genericBadge).toBeVisible();
    await expect(genericBadge).toHaveText("Generic");

    // Check a JAM SPI badge (wat is collapsed by default, expand it)
    await page.getByTestId("category-toggle-wat").click();
    const jamBadge = page.getByTestId("example-format-add-jam");
    await expect(jamBadge).toBeVisible();
    await expect(jamBadge).toHaveText("JAM SPI");

    // Check a trace badge (traces is expanded by default)
    const traceBadge = page.getByTestId("example-format-trace-001");
    await expect(traceBadge).toBeVisible();
    await expect(traceBadge).toHaveText("Trace");
  });

  test("remote example shows loading state while fetching", async ({
    page,
  }) => {
    // Intercept the remote URL to add a delay so we can observe loading state
    await page.route("**/raw.githubusercontent.com/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.abort();
    });

    // json-test-vectors is collapsed by default, expand it
    await page.getByTestId("category-toggle-json-test-vectors").click();
    const remoteCard = page.getByTestId("example-card-inst-add-64");
    await expect(remoteCard).toBeVisible();
    await remoteCard.click();

    // Should show a loading indicator on the card
    await expect(page.getByTestId("example-loading-inst-add-64")).toBeVisible({
      timeout: 3000,
    });
  });

  test("a failed remote fetch shows an error alert without crashing", async ({
    page,
  }) => {
    // Block all remote requests to force an error
    await page.route("**/raw.githubusercontent.com/**", (route) =>
      route.abort(),
    );

    // json-test-vectors is collapsed by default, expand it
    await page.getByTestId("category-toggle-json-test-vectors").click();
    const remoteCard = page.getByTestId("example-card-inst-add-64");
    await expect(remoteCard).toBeVisible();
    await remoteCard.click();

    // Error alert should appear
    await expect(page.getByTestId("example-error")).toBeVisible({
      timeout: 10000,
    });

    // The page should still be functional — other cards should still be visible
    await expect(page.getByTestId("example-card-add")).toBeVisible();
  });

  test("bundled examples render with format badge", async ({ page }) => {
    // "add" is a bundled example with a file field
    await expect(page.getByTestId("example-card-add")).toBeVisible();
    await expect(page.getByTestId("example-format-add")).toBeVisible();
    await expect(page.getByTestId("example-format-add")).toHaveText("Generic");
  });

  test("JAM SPI example with entrypoint metadata loads and navigates to debugger", async ({
    page,
  }) => {
    // add-jam is in wat (collapsed by default), expand it
    await page.getByTestId("category-toggle-wat").click();
    const card = page.getByTestId("example-card-add-jam");
    await expect(card).toBeVisible();
    await card.click();

    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId("config-step-load").click();

    // Should navigate to debugger page
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("pvm-status-typeberry")).toHaveText("OK");
  });

  test("category toggle shows correct example count", async ({ page }) => {
    // Generic PVM category has 6 examples
    const toggle = page.getByTestId("category-toggle-generic");
    await expect(toggle).toContainText("(6)");

    // WAT category has 3 examples
    const watToggle = page.getByTestId("category-toggle-wat");
    await expect(watToggle).toContainText("(3)");
  });
});
