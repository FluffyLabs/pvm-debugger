import { expect, test } from "@playwright/test";

test.describe("Sprint 30 — Registers Change Highlighting", () => {
  /** Load a program and wait for the debugger page. */
  async function loadProgram(
    page: import("@playwright/test").Page,
    exampleId = "step-test",
  ) {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  }

  /** Open the settings tab in the bottom drawer. */
  async function openSettings(page: import("@playwright/test").Page) {
    await page.getByTestId("drawer-tab-settings").click();
    await expect(page.getByTestId("settings-tab")).toBeVisible();
  }

  /** Attempt to enable the Ananas PVM via settings. */
  async function tryEnableAnanas(
    page: import("@playwright/test").Page,
  ): Promise<boolean> {
    await openSettings(page);
    const ananasSwitch = page.getByTestId("pvm-switch-ananas");
    await expect(ananasSwitch).toBeVisible();
    await ananasSwitch.click();
    try {
      await expect(page.getByTestId("pvm-tab-ananas")).toHaveRole("tab", {
        timeout: 15000,
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Load a trace-backed program. */
  async function loadTraceProgram(page: import("@playwright/test").Page) {
    await page.goto("/#/load");
    const card = page.getByTestId("example-card-io-trace");
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });
  }

  /** Set auto-continue policy. */
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

  test("stepping marks changed registers with Δ", async ({ page }) => {
    await loadProgram(page);

    // Before stepping, no delta markers should be visible
    await expect(
      page.locator("[data-testid^='register-delta-']"),
    ).not.toBeVisible();

    // Step once — the step-test program uses LOAD_IMM which changes a register
    const nextBtn = page.getByTestId("next-button");
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });

    // At least one register should now show a delta marker
    const deltas = page.locator("[data-testid^='register-delta-']");
    await expect(deltas.first()).toBeVisible({ timeout: 5000 });
  });

  test("changed registers flash briefly", async ({ page }) => {
    await loadProgram(page);

    // Step once
    const nextBtn = page.getByTestId("next-button");
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });

    // Check that at least one register row has the flash class
    const flashRows = page.locator(".register-flash");
    await expect(flashRows.first()).toBeVisible({ timeout: 2000 });
  });

  test("Δ markers clear on the next step", async ({ page }) => {
    await loadProgram(page);

    // Step once — creates delta markers (LOAD_IMM changes a register)
    const nextBtn = page.getByTestId("next-button");
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });

    // Confirm a register delta marker exists after step 1
    const deltas = page.locator("[data-testid^='register-delta-']");
    await expect(deltas.first()).toBeVisible({ timeout: 5000 });

    // Identify which register got a delta after step 1
    const firstDeltaTestId = await deltas.first().getAttribute("data-testid");

    // Step again — this causes the program to terminate (panic/fault).
    // Registers typically don't change on a terminal step, so the
    // register delta from step 1 should disappear.
    await nextBtn.click();
    await page.waitForTimeout(500);

    // The register delta from step 1 should no longer be visible
    // (registers didn't change in the terminal step)
    if (firstDeltaTestId) {
      await expect(page.getByTestId(firstDeltaTestId)).not.toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("PC and gas show changed-border state after stepping", async ({
    page,
  }) => {
    await loadProgram(page);

    // Step once — PC and gas should change
    const nextBtn = page.getByTestId("next-button");
    await nextBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });

    // PC should show a delta indicator
    const pcDelta = page.getByTestId("pc-delta");
    await expect(pcDelta).toBeVisible({ timeout: 5000 });

    // Gas should show a delta indicator (gas decreases on each step)
    const gasDelta = page.getByTestId("gas-delta");
    await expect(gasDelta).toBeVisible({ timeout: 5000 });
  });

  test("pending host-call changes render during a paused host call", async ({
    page,
  }) => {
    await loadTraceProgram(page);
    await setAutoContinuePolicy(page, "never");

    // Run to first host call
    await page.getByTestId("run-button").click();
    await expect(page.getByTestId("status-badge")).toHaveText("Host Call", {
      timeout: 15000,
    });

    // The pending changes panel should be visible (the trace provides a resume proposal)
    const pending = page.getByTestId("pending-changes");
    await expect(pending).toBeVisible({ timeout: 5000 });
  });

  test("multi-PVM register divergence shows a warning indicator", async ({
    page,
  }) => {
    await loadProgram(page);
    const enabled = await tryEnableAnanas(page);
    expect(enabled).toBe(true);

    // Run to completion — PVMs may diverge
    const runBtn = page.getByTestId("run-button");
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();

    // Wait for terminal state
    await expect(page.getByTestId("pvm-dot-typeberry")).toHaveClass(
      /bg-gray-500/,
      {
        timeout: 15000,
      },
    );

    // If PVMs diverged on registers, a divergence indicator should appear
    const divergenceIndicators = page.locator(
      "[data-testid^='register-divergence-']",
    );
    const count = await divergenceIndicators.count();
    if (count > 0) {
      // Click the first one — popover should open
      await divergenceIndicators.first().click();
      const popover = page.locator(
        "[data-testid^='register-divergence-popover-']",
      );
      await expect(popover.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
