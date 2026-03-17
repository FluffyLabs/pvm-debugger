import { test, expect } from "@playwright/test";

test.describe("Sprint 14 — Bottom Drawer Shell", () => {
  /** Load a program and wait for the debugger page to be visible. */
  async function loadProgram(page: import("@playwright/test").Page) {
    await page.goto("/#/load");
    const card = page.getByTestId("example-card-step-test");
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  test("drawer tab bar is visible on the debugger page", async ({ page }) => {
    await loadProgram(page);

    const tabBar = page.getByTestId("drawer-tab-bar");
    await expect(tabBar).toBeVisible();
  });

  test("all four tab labels are visible", async ({ page }) => {
    await loadProgram(page);

    await expect(page.getByTestId("drawer-tab-settings")).toBeVisible();
    await expect(page.getByTestId("drawer-tab-ecalli_trace")).toBeVisible();
    await expect(page.getByTestId("drawer-tab-host_call")).toBeVisible();
    await expect(page.getByTestId("drawer-tab-logs")).toBeVisible();

    // Verify text labels
    await expect(page.getByTestId("drawer-tab-settings")).toHaveText("Settings");
    await expect(page.getByTestId("drawer-tab-ecalli_trace")).toHaveText("Ecalli Trace");
    await expect(page.getByTestId("drawer-tab-host_call")).toHaveText("Host Call");
    await expect(page.getByTestId("drawer-tab-logs")).toHaveText("Logs");
  });

  test("clicking a tab expands the drawer", async ({ page }) => {
    await loadProgram(page);

    const drawer = page.getByTestId("bottom-drawer");

    // Initially collapsed — no content area
    await expect(page.getByTestId("drawer-content")).not.toBeVisible();

    // Click the Settings tab
    await page.getByTestId("drawer-tab-settings").click();

    // Content should now be visible
    await expect(page.getByTestId("drawer-content")).toBeVisible();
    await expect(page.getByTestId("drawer-content")).toContainText("Settings — coming soon");

    // Drawer should be taller than just the tab bar
    const box = await drawer.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThan(40);
  });

  test("clicking the active tab collapses the drawer", async ({ page }) => {
    await loadProgram(page);

    // Expand by clicking Settings
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("drawer-content")).toBeVisible();

    // Collapse by clicking the same tab
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("drawer-content")).not.toBeVisible();
  });

  test("clicking a different tab switches content", async ({ page }) => {
    await loadProgram(page);

    // Open Settings
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("drawer-content")).toContainText("Settings — coming soon");

    // Switch to Host Call
    await page.getByTestId("drawer-tab-host_call").click();
    await expect(page.getByTestId("drawer-content")).toContainText("Host Call — coming soon");
  });

  test("dragging the resize handle changes drawer height", async ({ page }) => {
    await loadProgram(page);

    // Open a tab first to reveal the drag handle
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("drawer-drag-handle")).toBeVisible();

    const drawer = page.getByTestId("bottom-drawer");
    const initialBox = await drawer.boundingBox();
    expect(initialBox).toBeTruthy();
    const initialHeight = initialBox!.height;

    // Drag the handle upward to expand
    const handle = page.getByTestId("drawer-drag-handle");
    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();

    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - 100, { steps: 10 });
    await page.mouse.up();

    const afterBox = await drawer.boundingBox();
    expect(afterBox).toBeTruthy();
    // Drawer should be taller after dragging up
    expect(afterBox!.height).toBeGreaterThan(initialHeight + 50);
  });

  test("drawer height clamps to 60% of viewport maximum", async ({ page }) => {
    await loadProgram(page);

    // Open a tab to enable dragging
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("drawer-drag-handle")).toBeVisible();

    const handle = page.getByTestId("drawer-drag-handle");
    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();

    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;

    // Drag far upward — well beyond 60% of viewport
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, 10, { steps: 20 });
    await page.mouse.up();

    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const maxAllowed = Math.floor(viewportHeight * 0.6) + 36 + 10; // content + tab bar + tolerance

    const drawer = page.getByTestId("bottom-drawer");
    const box = await drawer.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeLessThanOrEqual(maxAllowed);
  });

  test("drawer is positioned below the panel area", async ({ page }) => {
    await loadProgram(page);

    const panels = page.getByTestId("debugger-panels");
    const drawer = page.getByTestId("bottom-drawer");

    const panelsBox = await panels.boundingBox();
    const drawerBox = await drawer.boundingBox();

    expect(panelsBox).toBeTruthy();
    expect(drawerBox).toBeTruthy();

    // Drawer top should be at or below panels bottom
    expect(drawerBox!.y).toBeGreaterThanOrEqual(panelsBox!.y + panelsBox!.height - 2);
  });
});
