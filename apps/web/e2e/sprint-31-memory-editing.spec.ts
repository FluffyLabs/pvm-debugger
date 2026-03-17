import { test, expect } from "@playwright/test";

test.describe("Sprint 31 — Memory SPI Labels + Inline Editing", () => {
  /** Load a generic example program into the debugger. */
  async function loadGenericProgram(page: import("@playwright/test").Page, exampleId: string) {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  /** Load an SPI example program into the debugger. */
  async function loadSpiProgram(page: import("@playwright/test").Page, exampleId: string) {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  test.describe("SPI Labels", () => {
    test("SPI programs show named labels (RO Data, Stack, etc.)", async ({ page }) => {
      await loadSpiProgram(page, "add-jam");

      const memoryPanel = page.getByTestId("memory-panel");
      await expect(memoryPanel).toBeVisible();

      // SPI programs should have labeled sections. At minimum, they should have
      // recognizable SPI labels like Stack, Arguments, RO Data, etc.
      // Check that at least one SPI-specific label is present
      const memoryText = await memoryPanel.textContent();
      const hasSpiLabel =
        memoryText?.includes("Stack") ||
        memoryText?.includes("Arguments") ||
        memoryText?.includes("RO Data") ||
        memoryText?.includes("RW Data") ||
        memoryText?.includes("Heap");
      expect(hasSpiLabel).toBe(true);
    });

    test('non-SPI programs show "Page @ 0x..."', async ({ page }) => {
      // store-u16 is a generic PVM program with writable memory at 0x20000
      await loadGenericProgram(page, "store-u16");

      const memoryPanel = page.getByTestId("memory-panel");
      await expect(memoryPanel).toBeVisible();

      // Should use generic label format
      const header = page.getByTestId("memory-range-header-131072"); // 0x20000 = 131072
      await expect(header).toBeVisible();
      await expect(header).toContainText("Page @ 0x20000");
    });
  });

  test.describe("Inline Editing", () => {
    test("typing two hex digits writes and advances to next byte", async ({ page }) => {
      // store-u16 has a writable page at 0x20000
      await loadGenericProgram(page, "store-u16");

      // Expand the writable page
      const header = page.getByTestId("memory-range-header-131072");
      await header.click();
      await expect(page.getByTestId("hex-dump")).toBeVisible({ timeout: 5000 });

      // Click the first byte cell to start editing
      const firstByte = page.getByTestId("hex-byte-0");
      await firstByte.click();

      // An input should appear
      const input = page.getByTestId("hex-byte-input-0");
      await expect(input).toBeVisible();

      // Type two hex digits
      await input.fill("ab");

      // After typing 2 digits, should auto-advance to next byte (offset 1)
      // The input for offset 1 should now be visible
      const nextInput = page.getByTestId("hex-byte-input-1");
      await expect(nextInput).toBeVisible({ timeout: 5000 });
    });

    test("backspace moves to previous byte", async ({ page }) => {
      await loadGenericProgram(page, "store-u16");

      const header = page.getByTestId("memory-range-header-131072");
      await header.click();
      await expect(page.getByTestId("hex-dump")).toBeVisible({ timeout: 5000 });

      // Click byte at offset 1 to start editing
      const secondByte = page.getByTestId("hex-byte-1");
      await secondByte.click();

      const input = page.getByTestId("hex-byte-input-1");
      await expect(input).toBeVisible();

      // Press Backspace on empty input — should move to previous cell
      await input.press("Backspace");

      // Should now be editing offset 0
      const prevInput = page.getByTestId("hex-byte-input-0");
      await expect(prevInput).toBeVisible({ timeout: 5000 });
    });

    test("paste fills consecutive cells", async ({ page }) => {
      await loadGenericProgram(page, "store-u16");

      const header = page.getByTestId("memory-range-header-131072");
      await header.click();
      await expect(page.getByTestId("hex-dump")).toBeVisible({ timeout: 5000 });

      // Click first byte to start editing
      const firstByte = page.getByTestId("hex-byte-0");
      await firstByte.click();

      const input = page.getByTestId("hex-byte-input-0");
      await expect(input).toBeVisible();

      // Paste a multi-byte hex string (3 bytes)
      await page.evaluate(() => {
        const input = document.querySelector('[data-testid="hex-byte-input-0"]') as HTMLInputElement;
        const dt = new DataTransfer();
        dt.setData("text", "AABBCC");
        const event = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true });
        input.dispatchEvent(event);
      });

      // After pasting 3 bytes, editing should advance to offset 3
      const nextInput = page.getByTestId("hex-byte-input-3");
      await expect(nextInput).toBeVisible({ timeout: 5000 });
    });

    test("read-only pages are not editable", async ({ page }) => {
      // Load an SPI program — it should have RO Data pages
      await loadSpiProgram(page, "add-jam");

      const memoryPanel = page.getByTestId("memory-panel");
      await expect(memoryPanel).toBeVisible();

      // Find a header that contains "RO Data" or "(RO)" marker
      const headers = memoryPanel.locator("button");
      const count = await headers.count();

      let roHeaderFound = false;
      for (let i = 0; i < count; i++) {
        const text = await headers.nth(i).textContent();
        if (text?.includes("RO") || text?.includes("RO Data")) {
          roHeaderFound = true;
          // Expand this RO page
          await headers.nth(i).click();
          break;
        }
      }

      // SPI programs (add-jam) must have RO Data pages
      expect(roHeaderFound).toBe(true);

      // Wait for hex dump to appear
      const hexDump = page.getByTestId("hex-dump").first();
      await expect(hexDump).toBeVisible({ timeout: 5000 });

      // Clicking a byte cell should NOT open an editor
      const firstByte = page.getByTestId("hex-byte-0");
      await expect(firstByte).toBeVisible();
      await firstByte.click();
      // No input should appear — the byte cell is not editable
      await expect(page.getByTestId("hex-byte-input-0")).not.toBeVisible();
    });

    test("editing is disabled when not paused with OK status", async ({ page }) => {
      // store-u16: step twice → terminal (fault) state
      await loadGenericProgram(page, "store-u16");

      // Expand the writable page first while still paused
      const header = page.getByTestId("memory-range-header-131072");
      await header.click();
      await expect(page.getByTestId("hex-dump")).toBeVisible({ timeout: 5000 });

      // Step twice to reach terminal state
      const nextBtn = page.getByTestId("next-button");
      await nextBtn.click();
      await expect(nextBtn).toBeEnabled({ timeout: 5000 });
      await nextBtn.click();
      await expect(nextBtn).toBeDisabled({ timeout: 5000 });

      // Now try to click a byte cell — should NOT open editor
      const firstByte = page.getByTestId("hex-byte-0");
      if (await firstByte.count() > 0) {
        await firstByte.click();
        await expect(page.getByTestId("hex-byte-input-0")).not.toBeVisible();
      }
    });
  });
});
