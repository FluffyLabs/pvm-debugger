import { expect, test } from "@playwright/test";

test.describe("Sprint 06 — Memory Panel", () => {
  /**
   * Load an example program and wait for the debugger page.
   */
  async function loadProgram(
    page: import("@playwright/test").Page,
    exampleId: string,
  ) {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  }

  test("memory panel shows collapsed page headers after loading a program with memory", async ({
    page,
  }) => {
    // store-u16 has pageMap: [{ address: 131072 (0x20000), length: 4096, isWritable: true }]
    await loadProgram(page, "store-u16");

    const memoryPanel = page.getByTestId("memory-panel");
    await expect(memoryPanel).toBeVisible();

    // Should show the page header with address 0x20000 = 131072
    const header = page.getByTestId("memory-range-header-131072");
    await expect(header).toBeVisible();
    await expect(header).toContainText("Page @ 0x20000");

    // Should be collapsed — no hex dump visible
    await expect(page.getByTestId("hex-dump")).not.toBeVisible();
  });

  test("clicking a page header expands it to show hex dump", async ({
    page,
  }) => {
    await loadProgram(page, "store-u16");

    const header = page.getByTestId("memory-range-header-131072");
    await expect(header).toBeVisible();

    // Click to expand
    await header.click();

    // Hex dump should appear
    const hexDump = page.getByTestId("hex-dump");
    await expect(hexDump).toBeVisible({ timeout: 5000 });
  });

  test("clicking again collapses it", async ({ page }) => {
    await loadProgram(page, "store-u16");

    const header = page.getByTestId("memory-range-header-131072");

    // Expand
    await header.click();
    await expect(page.getByTestId("hex-dump")).toBeVisible({ timeout: 5000 });

    // Collapse
    await header.click();
    await expect(page.getByTestId("hex-dump")).not.toBeVisible();
  });

  test("hex dump shows address, hex bytes, and ASCII columns", async ({
    page,
  }) => {
    await loadProgram(page, "store-u16");

    // Expand the page
    await page.getByTestId("memory-range-header-131072").click();
    await expect(page.getByTestId("hex-dump")).toBeVisible({ timeout: 5000 });

    // Check address column — first row should be the base address 00020000
    const addresses = page.getByTestId("hex-address");
    await expect(addresses.first()).toContainText("00020000");

    // Check hex bytes column exists
    const hexBytes = page.getByTestId("hex-bytes");
    await expect(hexBytes.first()).toBeVisible();

    // Check ASCII column exists
    const asciiCol = page.getByTestId("hex-ascii");
    await expect(asciiCol.first()).toBeVisible();
  });

  test("zero bytes are visually dimmed", async ({ page }) => {
    await loadProgram(page, "store-u16");

    // Expand the page
    await page.getByTestId("memory-range-header-131072").click();
    await expect(page.getByTestId("hex-dump")).toBeVisible({ timeout: 5000 });

    // Zero bytes should have a dimmed class (text-muted-foreground/40)
    // At least some bytes in an empty-ish page should be zero
    const hexBytes = page.getByTestId("hex-bytes").first();
    const dimmedSpans = hexBytes.locator("span.text-muted-foreground\\/40");
    await expect(dimmedSpans.first()).toBeVisible();
  });

  test("expanded hex dump remains visible after stepping", async ({ page }) => {
    // store-u16 has a writable page at 0x20000
    await loadProgram(page, "store-u16");

    // Expand the page
    await page.getByTestId("memory-range-header-131072").click();
    await expect(page.getByTestId("hex-dump")).toBeVisible({ timeout: 5000 });

    // Step — this triggers snapshot version change, cache invalidation, and re-fetch
    const nextBtn = page.getByTestId("next-button");
    await nextBtn.click();
    // First step executes the store_u16 instruction (succeeds). PC advances past code.
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });
    await nextBtn.click();
    // Second step faults (PC past code end) → terminal state
    await expect(nextBtn).toBeDisabled({ timeout: 5000 });

    // The hex dump should still be visible (re-fetch succeeded, not stuck on "Loading…")
    await expect(page.getByTestId("hex-dump")).toBeVisible();
    // Address column should still show the correct base address
    await expect(page.getByTestId("hex-address").first()).toContainText(
      "00020000",
    );
  });

  test("a program with empty page map shows 'No memory pages.'", async ({
    page,
  }) => {
    // step-test has no pageMap
    await loadProgram(page, "step-test");

    const memoryPanel = page.getByTestId("memory-panel");
    await expect(memoryPanel).toBeVisible();
    await expect(memoryPanel).toContainText("No memory pages.");
  });
});
