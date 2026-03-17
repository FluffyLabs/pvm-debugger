import { test, expect } from "@playwright/test";

const NARROW_WIDTH = 375;
const NARROW_HEIGHT = 812;

test.describe("Sprint 35 — Mobile / Responsive Layout", () => {
  /** Load a program and wait for the debugger page. */
  async function loadProgram(page: import("@playwright/test").Page) {
    await page.goto("/#/load");
    const card = page.getByTestId("example-card-step-test");
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  test("debugger shows panel switcher on narrow viewport", async ({ page }) => {
    await loadProgram(page);
    await page.setViewportSize({ width: NARROW_WIDTH, height: NARROW_HEIGHT });

    const switcher = page.getByTestId("panel-switcher");
    await expect(switcher).toBeVisible();

    // All three switcher buttons are visible
    await expect(page.getByTestId("panel-switcher-instructions")).toBeVisible();
    await expect(page.getByTestId("panel-switcher-registers")).toBeVisible();
    await expect(page.getByTestId("panel-switcher-memory")).toBeVisible();
  });

  test("switching panels shows the correct content", async ({ page }) => {
    await loadProgram(page);
    await page.setViewportSize({ width: NARROW_WIDTH, height: NARROW_HEIGHT });

    // Default: instructions panel visible
    const instructions = page.getByTestId("panel-instructions");
    const registers = page.getByTestId("panel-registers");
    const memory = page.getByTestId("panel-memory");

    // Instructions panel should be visible initially
    await expect(instructions).toBeVisible();

    // Switch to registers
    await page.getByTestId("panel-switcher-registers").click();
    await expect(registers).toBeVisible();
    // Instructions should be hidden
    await expect(instructions).not.toBeVisible();

    // Switch to memory
    await page.getByTestId("panel-switcher-memory").click();
    await expect(memory).toBeVisible();
    // Registers should be hidden
    await expect(registers).not.toBeVisible();

    // Switch back to instructions
    await page.getByTestId("panel-switcher-instructions").click();
    await expect(instructions).toBeVisible();
    await expect(memory).not.toBeVisible();
  });

  test("bottom drawer is visible below the panel", async ({ page }) => {
    await loadProgram(page);
    await page.setViewportSize({ width: NARROW_WIDTH, height: NARROW_HEIGHT });

    // The bottom drawer should still be rendered
    const drawer = page.getByTestId("bottom-drawer");
    await expect(drawer).toBeVisible();

    // Drawer should be below the active panel
    const panels = page.getByTestId("debugger-panels");
    const panelsBox = await panels.boundingBox();
    const drawerBox = await drawer.boundingBox();

    expect(panelsBox).toBeTruthy();
    expect(drawerBox).toBeTruthy();
    expect(panelsBox!.y + panelsBox!.height).toBeLessThanOrEqual(drawerBox!.y + 2);
  });

  test("load page columns stack vertically on narrow viewport", async ({ page }) => {
    await page.goto("/#/load");
    await expect(page.getByTestId("load-page")).toBeVisible();
    await page.setViewportSize({ width: NARROW_WIDTH, height: NARROW_HEIGHT });

    const left = page.getByTestId("load-page-left");
    const right = page.getByTestId("load-page-right");

    await expect(left).toBeVisible();
    await expect(right).toBeVisible();

    // In stacked layout, left should appear above right
    const leftBox = await left.boundingBox();
    const rightBox = await right.boundingBox();
    expect(leftBox).toBeTruthy();
    expect(rightBox).toBeTruthy();
    expect(leftBox!.y).toBeLessThan(rightBox!.y);
  });
});
