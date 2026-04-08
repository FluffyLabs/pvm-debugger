import { expect, test } from "@playwright/test";

test.describe("Sprint 43 — Fetch Host Call Handler", () => {
  /** Load an all-ecalli example and navigate through SPI config to debugger. */
  async function loadAllEcalliExample(
    page: import("@playwright/test").Page,
    variant: "refine" | "accumulate",
  ) {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-all-ecalli-${variant}`);
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();

    // Wait for config step and click load
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId("config-step-load").click();

    // Wait for debugger page
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  }

  function pvmStatus(page: import("@playwright/test").Page) {
    return page.getByTestId("pvm-status-typeberry");
  }

  /** Set auto-continue to never. */
  async function setNeverAutoContinue(page: import("@playwright/test").Page) {
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
    await page.getByTestId("auto-continue-radio-never").click();
    await expect(page.getByTestId("auto-continue-radio-never")).toBeChecked();
    // Switch back to host call tab
    await page.getByTestId("drawer-tab-host_call").click();
  }

  /** Run until we hit a host call pause. */
  async function runToHostCall(page: import("@playwright/test").Page) {
    await page.getByTestId("run-button").click();
    await expect(pvmStatus(page)).toHaveText("Host Call", { timeout: 15000 });
  }

  /** Step through host calls until we find a fetch (index 1), up to maxSteps. */
  async function stepToFetchHostCall(
    page: import("@playwright/test").Page,
    maxSteps = 30,
  ) {
    for (let i = 0; i < maxSteps; i++) {
      const fetchHandler = page.getByTestId("fetch-host-call");
      const isVisible = await fetchHandler.isVisible().catch(() => false);
      if (isVisible) return true;

      // Resume past this host call (single step)
      await page.getByTestId("next-button").click();
      await page.waitForTimeout(200);

      // Run to the next host call
      await page.getByTestId("run-button").click();
      try {
        await expect(pvmStatus(page)).toHaveText("Host Call", {
          timeout: 10000,
        });
      } catch {
        return false;
      }
    }
    return false;
  }

  test.describe("Refine context", () => {
    test("fetch handler UI renders for all-ecalli-refine", async ({ page }) => {
      await loadAllEcalliExample(page, "refine");
      await setNeverAutoContinue(page);
      await runToHostCall(page);

      await expect(page.getByTestId("host-call-tab")).toBeVisible({
        timeout: 5000,
      });

      // Step to a fetch host call
      const found = await stepToFetchHostCall(page);
      expect(found).toBe(true);

      // Verify fetch handler is shown and generic empty is NOT
      await expect(page.getByTestId("fetch-host-call")).toBeVisible();
      await expect(page.getByTestId("host-call-empty")).not.toBeVisible();
    });

    test("struct mode shows editor and encoded output", async ({ page }) => {
      await loadAllEcalliExample(page, "refine");
      await setNeverAutoContinue(page);
      await runToHostCall(page);

      await expect(page.getByTestId("host-call-tab")).toBeVisible({
        timeout: 5000,
      });
      const found = await stepToFetchHostCall(page);
      expect(found).toBe(true);

      // Switch to Struct mode
      const structBtn = page.getByTestId("fetch-mode-struct");
      await expect(structBtn).toBeVisible();
      await structBtn.click();

      // Verify struct editor is shown
      await expect(page.getByTestId("struct-editor")).toBeVisible();

      // Verify encoded output preview is shown
      await expect(page.getByTestId("struct-encoded-output")).toBeVisible();
    });

    test("NONE toggle hides mode tabs", async ({ page }) => {
      await loadAllEcalliExample(page, "refine");
      await setNeverAutoContinue(page);
      await runToHostCall(page);

      await expect(page.getByTestId("host-call-tab")).toBeVisible({
        timeout: 5000,
      });
      const found = await stepToFetchHostCall(page);
      expect(found).toBe(true);

      // Verify Struct mode button is visible before NONE
      await expect(page.getByTestId("fetch-mode-struct")).toBeVisible();

      // Toggle NONE
      const noneToggle = page.getByTestId("none-toggle");
      await expect(noneToggle).toBeVisible();
      await noneToggle.check();

      // Struct mode button should be hidden
      await expect(page.getByTestId("fetch-mode-struct")).not.toBeVisible();

      // Output preview should show NONE sentinel
      const preview = page.getByTestId("output-preview");
      await expect(preview).toBeVisible();
      const text = await preview.textContent();
      expect(text).toContain("18446744073709551615");
    });

    test("fetch-specific badges in trace (count > 0)", async ({ page }) => {
      await loadAllEcalliExample(page, "refine");
      await setNeverAutoContinue(page);

      // Step through several host calls to generate trace data with fetch entries
      await runToHostCall(page);
      for (let i = 0; i < 5; i++) {
        await page.getByTestId("next-button").click();
        await page.waitForTimeout(200);
        await page.getByTestId("run-button").click();
        try {
          await expect(pvmStatus(page)).toHaveText("Host Call", {
            timeout: 10000,
          });
        } catch {
          break;
        }
      }

      // Open ecalli trace tab
      await page.getByTestId("drawer-tab-ecalli_trace").click();
      await expect(page.getByTestId("ecalli-trace-tab")).toBeVisible();

      // Look for trace badges
      const badges = page.locator("[data-testid='trace-entry-badge']");
      await expect(badges.first()).toBeVisible({ timeout: 5000 });

      // Count fetch-specific badges (those containing "fetch")
      const allBadges = await badges.allTextContents();
      const fetchCount = allBadges.filter((b) =>
        b.toLowerCase().includes("fetch"),
      ).length;
      expect(fetchCount).toBeGreaterThan(0);
    });
  });

  test.describe("Accumulate context", () => {
    test("all-ecalli-accumulate loads and works", async ({ page }) => {
      await loadAllEcalliExample(page, "accumulate");
      await setNeverAutoContinue(page);
      await runToHostCall(page);

      await expect(page.getByTestId("host-call-tab")).toBeVisible({
        timeout: 5000,
      });

      // Step to a fetch host call
      const found = await stepToFetchHostCall(page);
      expect(found).toBe(true);

      // Verify fetch handler is shown
      await expect(page.getByTestId("fetch-host-call")).toBeVisible();

      // Verify kind description is displayed
      await expect(page.getByTestId("fetch-kind-description")).toBeVisible();
    });

    test("auto-continue flow works for accumulate", async ({ page }) => {
      await loadAllEcalliExample(page, "accumulate");

      // Don't set "never" — let auto-continue work
      // Just run and wait for terminal state
      await page.getByTestId("run-button").click();

      // Wait for program to reach a terminal state or pause at host call
      // with default auto-continue settings
      await page.waitForTimeout(3000);

      // Verify the debugger is still operational (didn't crash)
      await expect(page.getByTestId("debugger-page")).toBeVisible();
    });
  });
});
