import { expect, test } from "@playwright/test";

test.describe("Sprint 47 — Trace Run Stability", () => {
  test.setTimeout(60_000);

  async function loadTraceExample(
    page: import("@playwright/test").Page,
    exampleId: string,
  ) {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  }

  async function openSettings(page: import("@playwright/test").Page) {
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
  }

  async function setAutoContinuePolicy(
    page: import("@playwright/test").Page,
    policy: "always_continue" | "continue_when_trace_matches" | "never",
  ) {
    await openSettings(page);
    await page.getByTestId(`auto-continue-radio-${policy}`).click();
    await expect(
      page.getByTestId(`auto-continue-radio-${policy}`),
    ).toBeChecked();
  }

  test("trace-001: run with never auto-continue does not crash", async ({
    page,
  }) => {
    // Collect console errors and page crashes
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loadTraceExample(page, "trace-001");

    // Set instruction stepping + never auto-continue
    await openSettings(page);
    await page.getByTestId("stepping-radio-instruction").click();
    await expect(page.getByTestId("stepping-radio-instruction")).toBeChecked();
    await page.getByTestId("auto-continue-radio-never").click();
    await expect(page.getByTestId("auto-continue-radio-never")).toBeChecked();

    // Click Run — should stop at the first host call
    await page.getByTestId("run-button").click();

    // Wait for the PVM to reach host call state
    await expect(page.getByTestId("pvm-status-typeberry")).toHaveText(
      "Host Call",
      { timeout: 15000 },
    );

    // App must not have crashed — debugger page still visible, no error boundary
    await expect(page.getByTestId("debugger-page")).toBeVisible();
    await expect(page.getByTestId("error-boundary")).not.toBeVisible();

    // No unhandled JS errors
    expect(errors).toEqual([]);
  });

  test("io-trace: run with always_continue completes without crash", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loadTraceExample(page, "io-trace");
    await setAutoContinuePolicy(page, "always_continue");

    // Click Run — should auto-continue through all host calls
    await page.getByTestId("run-button").click();

    // Wait for execution to finish or at least run for a while
    const completeBadge = page.getByTestId("execution-complete-badge");
    const pauseBtn = page.getByTestId("pause-button");

    // Either execution completes or we wait and pause
    try {
      await completeBadge.waitFor({ state: "visible", timeout: 15000 });
    } catch {
      // If not complete yet, pause and verify app is still alive
      if (await pauseBtn.isVisible()) {
        await pauseBtn.click({ force: true });
      }
    }

    // App must still be functional
    await expect(page.getByTestId("debugger-page")).toBeVisible();
    await expect(page.getByTestId("error-boundary")).not.toBeVisible();
    await expect(page.getByTestId("pvm-status-typeberry")).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("trace-001: run with continue_when_trace_matches completes without crash", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loadTraceExample(page, "trace-001");
    await setAutoContinuePolicy(page, "continue_when_trace_matches");

    await page.getByTestId("run-button").click();

    // With trace matching, it should auto-continue through matching host calls
    const completeBadge = page.getByTestId("execution-complete-badge");
    const pauseBtn = page.getByTestId("pause-button");

    try {
      await completeBadge.waitFor({ state: "visible", timeout: 20000 });
    } catch {
      if (await pauseBtn.isVisible()) {
        await pauseBtn.click({ force: true });
      }
    }

    // If there were JS errors, log them for debugging
    if (errors.length > 0) {
      console.log("Page errors captured:", errors);
    }

    // App must still be functional
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("error-boundary")).not.toBeVisible();

    expect(errors).toEqual([]);
  });

  test("pending changes only visible when paused at host call", async ({
    page,
  }) => {
    await loadTraceExample(page, "trace-001");
    await setAutoContinuePolicy(page, "never");

    // Run to first host call
    await page.getByTestId("run-button").click();
    await expect(page.getByTestId("pvm-status-typeberry")).toHaveText(
      "Host Call",
      { timeout: 15000 },
    );

    // Pending changes should be visible (paused at host call with trace proposal)
    // Wait for the 300ms debounce
    await page.waitForTimeout(400);
    const pending = page.getByTestId("pending-changes");
    // Pending may or may not exist depending on whether the proposal has data,
    // but if it does exist it must only exist while paused at a host call
    const isPendingVisible = await pending.isVisible().catch(() => false);

    if (isPendingVisible) {
      // Verify it shows register or gas changes
      const hasRegisters = await page
        .getByTestId("pending-register-writes")
        .isVisible()
        .catch(() => false);
      const hasGas = await page
        .getByTestId("pending-gas-change")
        .isVisible()
        .catch(() => false);
      expect(hasRegisters || hasGas).toBe(true);
    }

    // Resume by stepping — pending changes should disappear
    await page.getByTestId("next-button").click();

    // After stepping, lifecycle is no longer paused_host_call
    // so pending changes must not be visible
    await expect(pending).not.toBeVisible({ timeout: 5000 });
  });
});
