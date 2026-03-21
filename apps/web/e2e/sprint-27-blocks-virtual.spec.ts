import { test, expect } from "@playwright/test";

/** SPI examples that require expanding a collapsed category and going through config step. */
const SPI_EXAMPLES: Record<string, string> = { "add-jam": "wat", "fibonacci-jam": "wat", "as-add": "assemblyscript" };

async function loadProgram(page: import("@playwright/test").Page, exampleId = "fibonacci") {
  await page.goto("/#/load");
  const categoryId = SPI_EXAMPLES[exampleId];
  if (categoryId) {
    await page.getByTestId(`category-toggle-${categoryId}`).click();
  }
  const card = page.getByTestId(`example-card-${exampleId}`);
  await expect(card).toBeVisible();
  await card.click();
  if (categoryId) {
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
  }
  await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
}

test.describe("Sprint 27 — Block Folding + Virtualization", () => {
  test("block headers are visible and labeled Block N", async ({ page }) => {
    await loadProgram(page, "add-jam");

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // At least one block header should be visible
    const header0 = page.getByTestId("block-header-0");
    await expect(header0).toBeVisible();
    await expect(header0).toContainText("Block 0");
  });

  test("clicking a block header collapses its instructions", async ({ page }) => {
    await loadProgram(page, "add-jam");

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // Find block 0 header
    const header0 = page.getByTestId("block-header-0");
    await expect(header0).toBeVisible();

    // Count instruction rows visible in block 0 before collapse.
    // We rely on instruction-row-* testids being present when expanded.
    const scrollArea = page.getByTestId("instructions-scroll");
    const rowsBefore = await scrollArea.locator("[data-testid^='instruction-row-']").count();
    expect(rowsBefore).toBeGreaterThan(0);

    // Find a block that is NOT the one containing the current PC
    // (current-PC block auto-expands). Use the last block header.
    const allHeaders = panel.locator("[data-testid^='block-header-']");
    const headerCount = await allHeaders.count();
    expect(headerCount).toBeGreaterThan(1);

    // Use the last block header (unlikely to contain current PC)
    const lastHeader = allHeaders.last();

    // Click to collapse
    await lastHeader.click();

    // The header should still be visible (aria-expanded=false)
    await expect(lastHeader).toHaveAttribute("aria-expanded", "false");

    // Instruction rows should decrease
    const rowsAfter = await scrollArea.locator("[data-testid^='instruction-row-']").count();
    expect(rowsAfter).toBeLessThan(rowsBefore);
  });

  test("clicking a collapsed block header expands it", async ({ page }) => {
    await loadProgram(page, "add-jam");

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // Find a non-current-PC block
    const allHeaders = panel.locator("[data-testid^='block-header-']");
    const headerCount = await allHeaders.count();
    expect(headerCount).toBeGreaterThan(1);
    const lastHeader = allHeaders.last();

    const scrollArea = page.getByTestId("instructions-scroll");

    // Collapse
    await lastHeader.click();
    await expect(lastHeader).toHaveAttribute("aria-expanded", "false");
    const rowsCollapsed = await scrollArea.locator("[data-testid^='instruction-row-']").count();

    // Expand
    await lastHeader.click();
    await expect(lastHeader).toHaveAttribute("aria-expanded", "true");
    const rowsExpanded = await scrollArea.locator("[data-testid^='instruction-row-']").count();

    expect(rowsExpanded).toBeGreaterThan(rowsCollapsed);
  });

  test("large program keeps DOM row count bounded via virtualization", async ({ page }) => {
    // Load a larger program (fibonacci has many instructions)
    await loadProgram(page, "fibonacci");

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    const scrollArea = page.getByTestId("instructions-scroll");
    // Count all mounted rows (both headers and instruction rows)
    const mountedItems = await scrollArea.locator("[data-testid^='instruction-row-'], [data-testid^='block-header-']").count();

    // With virtualization, the mounted count should be much less than the total
    // instruction count. A reasonable upper bound: the overscan (15) * 2 + visible rows
    // should still be well under the total number of instructions in fibonacci.
    // We just check it's bounded reasonably (< 200 elements even for large programs).
    expect(mountedItems).toBeLessThan(200);
    expect(mountedItems).toBeGreaterThan(0);
  });

  test("current PC highlight still works with block headers", async ({ page }) => {
    await loadProgram(page, "add-jam");

    // add-jam starts at PC=5
    const row = page.getByTestId("instruction-row-5");
    await expect(row).toBeVisible();
    await expect(row).toHaveClass(/instruction-row-current/);
  });

  test("breakpoints still work with block headers", async ({ page }) => {
    await loadProgram(page, "add-jam");

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // Find a visible instruction row
    const rows = panel.locator("[data-testid^='instruction-row-']");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(1);

    const secondRowTestId = await rows.nth(1).getAttribute("data-testid");
    const pc = secondRowTestId!.replace("instruction-row-", "");

    // Click gutter to set breakpoint
    const gutter = page.getByTestId(`breakpoint-gutter-${pc}`);
    await gutter.click();
    const dot = page.getByTestId(`breakpoint-dot-${pc}`);
    await expect(dot).toBeVisible();
  });
});
