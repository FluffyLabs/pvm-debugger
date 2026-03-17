import { test, expect } from "@playwright/test";

test.describe("Sprint 34 — Persistence + Reload", () => {
  /** Load an example program by card ID and wait for the debugger page. */
  async function loadProgram(page: import("@playwright/test").Page, exampleId = "step-test") {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  }

  /** Open the settings tab in the bottom drawer. */
  async function openSettings(page: import("@playwright/test").Page) {
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
  }

  test("refreshing restores the same program at initial state", async ({ page }) => {
    await loadProgram(page);

    // Verify debugger page and PVM status
    await expect(page.getByTestId("debugger-page")).toBeVisible();
    await expect(page.getByTestId("pvm-status-typeberry")).toHaveText("OK");

    // Remember the initial PC
    const initialPc = await page.getByTestId("pc-value").textContent();

    // Reload the page
    await page.reload();

    // Should restore to debugger page without going through load wizard
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("pvm-status-typeberry")).toHaveText("OK");

    // PC should be the same initial value (fresh initial state)
    await expect(page.getByTestId("pc-value")).toHaveText(initialPc!);
  });

  test("restored state is fresh initial state, not mid-execution", async ({ page }) => {
    await loadProgram(page);

    // Capture the initial PC before stepping
    const initialPc = await page.getByTestId("pc-value").textContent();

    // Step forward to mutate state
    await page.getByTestId("next-button").click();
    // Wait for PC to change (execution happened)
    await expect(page.getByTestId("pc-value")).not.toHaveText(initialPc!);

    const steppedPc = await page.getByTestId("pc-value").textContent();
    expect(steppedPc).not.toBe(initialPc);

    // Reload — should restore to initial state, not the stepped state
    await page.reload();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("pc-value")).toHaveText(initialPc!);
    await expect(page.getByTestId("pvm-status-typeberry")).toHaveText("OK");
  });

  test("Back to Loader clears program persistence", async ({ page }) => {
    await loadProgram(page);
    await expect(page.getByTestId("debugger-page")).toBeVisible();

    // Click "Load" (Back to Loader)
    await page.getByTestId("load-button").click();
    await expect(page.getByTestId("load-page")).toBeVisible();

    // Reload the page
    await page.reload();

    // Should stay on load page — persistence was cleared
    await expect(page.getByTestId("load-page")).toBeVisible({ timeout: 15000 });
  });

  test("stepping mode persists through refresh", async ({ page }) => {
    await loadProgram(page);
    await openSettings(page);

    // Switch to Block mode
    await page.getByTestId("stepping-radio-block").click();
    await expect(page.getByTestId("stepping-radio-block")).toBeChecked();

    // Reload the page — program should restore, settings should persist
    await page.reload();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
    await openSettings(page);

    // Block mode should still be selected
    await expect(page.getByTestId("stepping-radio-block")).toBeChecked();
  });

  test("successful restore does not flash the load page", async ({ page }) => {
    await loadProgram(page);

    // Inject a MutationObserver before reload to detect if load-page ever appears
    await page.addInitScript(() => {
      (window as any).__loadPageEverSeen = false;
      const observer = new MutationObserver(() => {
        if (document.querySelector('[data-testid="load-page"]')) {
          (window as any).__loadPageEverSeen = true;
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });

    await page.reload();

    // Wait for the debugger page to appear (restore complete)
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });

    // Verify load page was never rendered during restore
    const loadPageEverSeen = await page.evaluate(() => (window as any).__loadPageEverSeen);
    expect(loadPageEverSeen).toBe(false);
  });

  test("SPI entrypoint changes survive refresh", async ({ page }) => {
    // Load a JAM SPI example (add-jam defaults to accumulate with PC=5)
    await loadProgram(page, "add-jam");

    // Verify the initial PC is 0x0005 (accumulate entrypoint)
    await expect(page.getByTestId("pc-value")).toHaveText("0x0005");

    // Reload the page
    await page.reload();

    // Should restore to the debugger with the same SPI entrypoint
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("pc-value")).toHaveText("0x0005");
    await expect(page.getByTestId("pvm-status-typeberry")).toHaveText("OK");
  });

  test("corrupted persistence falls back to loader with error alert", async ({ page }) => {
    await loadProgram(page);

    // Corrupt the persisted payload
    await page.evaluate(() => {
      localStorage.setItem("pvmdbg:payload", "not-valid-hex-data");
    });

    // Set up dialog handler before reload
    const dialogPromise = page.waitForEvent("dialog");

    await page.reload();

    // Should get an alert about failed restore
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe(
      "Failed to restore previous session. Please load a program.",
    );
    await dialog.accept();

    // Should end up on load page
    await expect(page.getByTestId("load-page")).toBeVisible({ timeout: 15000 });

    // Corrupted keys should be cleared — another reload stays on load page
    await page.reload();
    await expect(page.getByTestId("load-page")).toBeVisible({ timeout: 15000 });
  });
});
