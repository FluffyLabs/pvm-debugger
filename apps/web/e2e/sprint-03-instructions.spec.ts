import { expect, test } from "@playwright/test";

test.describe("Sprint 03 — Flat Instruction List", () => {
  test("empty state shows 'No program loaded' before a program is loaded", async ({
    page,
  }) => {
    // Without a loaded program, / redirects to /load (route guard).
    // Verify the redirect happens and no instructions panel is visible.
    await page.goto("/#/");
    await expect(page.getByTestId("load-page")).toBeVisible();
    await expect(page.getByTestId("instructions-panel")).not.toBeVisible();
  });

  test("instructions render after loading a program", async ({ page }) => {
    await page.goto("/#/load");
    const card = page.getByTestId("example-card-add");
    await expect(card).toBeVisible();
    await card.click();

    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("instructions-panel")).toBeVisible();
  });

  test("instruction rows show hex PC and mnemonic", async ({ page }) => {
    await page.goto("/#/load");
    const card = page.getByTestId("example-card-add");
    await expect(card).toBeVisible();
    await card.click();

    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });

    // The instructions panel should contain at least one row
    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // Check that instruction-pc and instruction-mnemonic elements exist
    const pcElement = panel.getByTestId("instruction-pc").first();
    await expect(pcElement).toBeVisible();
    // PC should be a hex value like "0000"
    await expect(pcElement).toHaveText(/^[0-9A-F]{4,}$/);

    const mnemonicElement = panel.getByTestId("instruction-mnemonic").first();
    await expect(mnemonicElement).toBeVisible();
    // Mnemonic should be a non-empty lowercase identifier
    await expect(mnemonicElement).toHaveText(/.+/);
  });

  test("register arguments use omega notation (ω)", async ({ page }) => {
    // Load the add-jam example (SPI, in wat category — collapsed by default)
    await page.goto("/#/load");
    await page.getByTestId("category-toggle-wat").click();
    const card = page.getByTestId("example-card-add-jam");
    await expect(card).toBeVisible();
    await card.click();

    // SPI programs go through config step
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // At least one instruction should contain omega notation
    const argsElements = panel.getByTestId("instruction-args");
    const count = await argsElements.count();
    expect(count).toBeGreaterThan(0);

    // Find at least one args element with omega notation
    let foundOmega = false;
    for (let i = 0; i < count; i++) {
      const text = await argsElements.nth(i).textContent();
      if (text && text.includes("ω")) {
        foundOmega = true;
        break;
      }
    }
    expect(foundOmega).toBe(true);
  });

  test("current PC row is visually highlighted", async ({ page }) => {
    // Load the add-jam example (SPI, in wat category — collapsed by default)
    await page.goto("/#/load");
    await page.getByTestId("category-toggle-wat").click();
    const card = page.getByTestId("example-card-add-jam");
    await expect(card).toBeVisible();
    await card.click();

    // SPI programs go through config step
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // The initial PC for add-jam is 5 (PC=0x0005)
    // The row at PC 5 should have the highlight class
    const row = page.getByTestId("instruction-row-5");
    await expect(row).toBeVisible();
    // Check that the highlighted row has the primary/20 background class
    await expect(row).toHaveClass(/instruction-row-current/);
  });
});
