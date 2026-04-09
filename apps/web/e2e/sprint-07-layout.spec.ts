import { expect, test } from "@playwright/test";

test.describe("Sprint 07 — 3-Column Debugger Layout", () => {
  /** Load a program and wait for the debugger page to be visible. */
  async function loadProgram(page: import("@playwright/test").Page) {
    await page.goto("/#/load");
    const card = page.getByTestId("example-card-step-test");
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  }

  test("three panel columns are visible side by side", async ({ page }) => {
    await loadProgram(page);

    const instructions = page.getByTestId("panel-instructions");
    const registers = page.getByTestId("panel-registers");
    const memory = page.getByTestId("panel-memory");

    await expect(instructions).toBeVisible();
    await expect(registers).toBeVisible();
    await expect(memory).toBeVisible();

    // Verify columns are laid out horizontally (left-to-right order)
    const iBox = await instructions.boundingBox();
    const rBox = await registers.boundingBox();
    const mBox = await memory.boundingBox();

    expect(iBox).toBeTruthy();
    expect(rBox).toBeTruthy();
    expect(mBox).toBeTruthy();

    // Instructions is to the left of Registers
    expect(iBox?.x + iBox?.width).toBeLessThanOrEqual(rBox?.x + 2);
    // Registers is to the left of Memory
    expect(rBox?.x + rBox?.width).toBeLessThanOrEqual(mBox?.x + 2);
  });

  test("panel headers align at the same height", async ({ page }) => {
    await loadProgram(page);

    const instructions = page.getByTestId("panel-instructions");
    const registers = page.getByTestId("panel-registers");
    const memory = page.getByTestId("panel-memory");

    const iBox = await instructions.boundingBox();
    const rBox = await registers.boundingBox();
    const mBox = await memory.boundingBox();

    expect(iBox).toBeTruthy();
    expect(rBox).toBeTruthy();
    expect(mBox).toBeTruthy();

    // All panels start at the same Y coordinate (header alignment)
    expect(Math.abs(iBox?.y - rBox?.y)).toBeLessThan(2);
    expect(Math.abs(rBox?.y - mBox?.y)).toBeLessThan(2);
  });

  test("toolbar row is visible above the panels", async ({ page }) => {
    await loadProgram(page);

    const toolbar = page.getByTestId("debugger-toolbar");
    const panels = page.getByTestId("debugger-panels");

    await expect(toolbar).toBeVisible();
    await expect(panels).toBeVisible();

    const tBox = await toolbar.boundingBox();
    const pBox = await panels.boundingBox();

    expect(tBox).toBeTruthy();
    expect(pBox).toBeTruthy();

    // Toolbar is above the panel area
    expect(tBox?.y + tBox?.height).toBeLessThanOrEqual(pBox?.y + 2);
  });

  test("each panel scrolls independently", async ({ page }) => {
    await loadProgram(page);

    // Use explicit data-testid selectors (not CSS class names) for scroll containers
    const instructionsScroll = page.getByTestId("instructions-scroll");
    const registersScroll = page.getByTestId("registers-scroll");

    // Scroll the instructions panel
    await instructionsScroll.evaluate((el) => {
      el.scrollTop = 50;
    });

    // Registers panel should not have scrolled
    const regScrollTop = await registersScroll.evaluate((el) => el.scrollTop);
    expect(regScrollTop).toBe(0);
  });

  test("PVM status remains visible in the toolbar", async ({ page }) => {
    await loadProgram(page);

    // The PVM status badge should be in the toolbar area
    const toolbar = page.getByTestId("debugger-toolbar");
    await expect(toolbar).toBeVisible();

    // Status badge for the typeberry PVM
    const status = page.getByTestId("pvm-status-typeberry");
    await expect(status).toBeVisible();
    await expect(status).toHaveText(/OK|Paused/i);
  });

  test("page does not scroll — layout fills viewport", async ({ page }) => {
    await loadProgram(page);

    // The app-content area should not be scrollable
    const isPageScrollable = await page.evaluate(() => {
      const content = document.querySelector(".app-content");
      if (!content) return false;
      return content.scrollHeight > content.clientHeight;
    });

    expect(isPageScrollable).toBe(false);
  });

  test("previous sprint functionality still works (Next button)", async ({
    page,
  }) => {
    await loadProgram(page);

    const nextBtn = page.getByTestId("next-button");
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).toBeEnabled();

    const pcValue = page.getByTestId("pc-value");
    await expect(pcValue).toHaveText("0x0000");

    await nextBtn.click();
    await expect(pcValue).not.toHaveText("0x0000", { timeout: 5000 });
  });
});
