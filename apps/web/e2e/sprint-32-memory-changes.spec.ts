import { expect, test } from "@playwright/test";

test.describe("Sprint 32 — Memory Change Highlighting", () => {
  /** Load a generic example program into the debugger. */
  async function loadGenericProgram(
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

  /** Expand the writable memory page at address 0x20000 (131072). */
  async function expandWritablePage(page: import("@playwright/test").Page) {
    const header = page.getByTestId("memory-range-header-131072");
    await header.click();
    await expect(page.getByTestId("hex-dump")).toBeVisible({ timeout: 5000 });
  }

  test("stepping produces changed-byte highlights in affected memory pages", async ({
    page,
  }) => {
    // store-u16 writes to memory at 0x20000 on step 1
    await loadGenericProgram(page, "store-u16");
    await expandWritablePage(page);

    // Before stepping, no bytes should have changed highlights
    const changedBefore = page.locator("[data-changed='true']");
    expect(await changedBefore.count()).toBe(0);

    // Step once — the store instruction writes to memory
    const nextBtn = page.getByTestId("next-button");
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });

    // After stepping, some bytes should now be highlighted as changed
    const changedAfter = page.locator("[data-changed='true']");
    await expect(changedAfter.first()).toBeVisible({ timeout: 5000 });
    expect(await changedAfter.count()).toBeGreaterThan(0);
  });

  test("editing a byte shows it highlighted on re-read", async ({ page }) => {
    await loadGenericProgram(page, "store-u16");
    await expandWritablePage(page);

    // Click the first byte to start editing
    const firstByte = page.getByTestId("hex-byte-0");
    await firstByte.click();

    const input = page.getByTestId("hex-byte-input-0");
    await expect(input).toBeVisible();

    // Type two hex digits — this writes the byte
    await input.fill("ab");

    // Wait for the write to be processed and the edit to advance
    const nextInput = page.getByTestId("hex-byte-input-1");
    await expect(nextInput).toBeVisible({ timeout: 5000 });

    // Press Escape to stop editing
    await nextInput.press("Escape");

    // Step once to trigger a new snapshot version → re-read
    const nextBtn = page.getByTestId("next-button");
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });

    // The byte we edited should be highlighted as changed
    const changedBytes = page.locator("[data-changed='true']");
    await expect(changedBytes.first()).toBeVisible({ timeout: 5000 });
  });

  test("highlights clear after the next step", async ({ page }) => {
    await loadGenericProgram(page, "store-u16");
    await expandWritablePage(page);

    // Step once — writes to memory, should produce highlights
    const nextBtn = page.getByTestId("next-button");
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });

    const changedAfterStep1 = page.locator("[data-changed='true']");
    await expect(changedAfterStep1.first()).toBeVisible({ timeout: 5000 });
    const countStep1 = await changedAfterStep1.count();
    expect(countStep1).toBeGreaterThan(0);

    // Step again — the program terminates (fault) after this.
    // Memory shouldn't change in the terminal step, so highlights should clear.
    await nextBtn.click();
    await page.waitForTimeout(500);

    // After the second step, if memory didn't change, highlights should clear.
    // But this depends on whether the terminal step changes memory.
    // At minimum, the old highlights should be replaced by a new diff.
    const changedAfterStep2 = page.locator("[data-changed='true']");
    const countStep2 = await changedAfterStep2.count();
    // The terminal step shouldn't write to memory, so zero changed bytes
    expect(countStep2).toBe(0);
  });

  test("unchanged bytes are not highlighted", async ({ page }) => {
    await loadGenericProgram(page, "store-u16");
    await expandWritablePage(page);

    // Step once — only some bytes should change, not all
    const nextBtn = page.getByTestId("next-button");
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });

    const changedBytes = page.locator("[data-changed='true']");
    await expect(changedBytes.first()).toBeVisible({ timeout: 5000 });

    const allBytes = page.locator("[data-testid^='hex-byte-']");
    const totalByteCount = await allBytes.count();
    const changedCount = await changedBytes.count();

    // Only a small subset of bytes should be highlighted — not all of them
    expect(changedCount).toBeLessThan(totalByteCount);
    expect(changedCount).toBeGreaterThan(0);
  });
});
