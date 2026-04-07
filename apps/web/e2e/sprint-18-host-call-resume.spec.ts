import { expect, test } from "@playwright/test";

test.describe("Sprint 18 — Host Call Resume Flow", () => {
  /** Load a trace-backed program and wait for the debugger page. */
  async function loadTraceProgram(
    page: import("@playwright/test").Page,
    exampleId = "io-trace",
  ) {
    await page.goto("/#/load");
    const card = page.getByTestId(`example-card-${exampleId}`);
    await expect(card).toBeVisible({ timeout: 15000 });
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

  /** Set the auto-continue policy in settings. */
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

  /** Get the PVM status text for the default (typeberry) PVM. */
  function pvmStatus(page: import("@playwright/test").Page) {
    return page.getByTestId("pvm-status-typeberry");
  }

  test("loading a trace-backed program and stepping past a host call works", async ({
    page,
  }) => {
    await loadTraceProgram(page);

    // Set policy to "never" so run stops on host calls
    await setAutoContinuePolicy(page, "never");

    // Click Run — it should stop at the first host call
    await page.getByTestId("run-button").click();
    await expect(pvmStatus(page)).toHaveText("Host Call", { timeout: 15000 });

    // Record PC before clicking Next
    const pcBefore = await page.getByTestId("pc-value").textContent();

    // Click Next — it should resume the host call and step past it
    const nextBtn = page.getByTestId("next-button");
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Wait for the step to process
    await page.waitForTimeout(500);

    // PC must have changed — proving the host call was resumed and a step executed.
    // (Status may land on another Host Call if the very next instruction is ecalli,
    // but the PC change proves the resume happened.)
    const pcAfter = await page.getByTestId("pc-value").textContent();
    expect(pcAfter).not.toBe(pcBefore);
  });

  test("Next while paused on host call resumes and steps", async ({ page }) => {
    await loadTraceProgram(page);
    await setAutoContinuePolicy(page, "never");

    // Run to first host call
    await page.getByTestId("run-button").click();
    await expect(pvmStatus(page)).toHaveText("Host Call", { timeout: 15000 });

    // Record current PC before clicking Next
    const pcBefore = await page.getByTestId("pc-value").textContent();

    // Click Next — resumes host call then steps 1 instruction
    await page.getByTestId("next-button").click();

    // Wait for the step to process
    await page.waitForTimeout(500);

    // PC should have changed (we resumed and stepped)
    const pcAfter = await page.getByTestId("pc-value").textContent();
    expect(pcAfter).not.toBe(pcBefore);
  });

  test("Run with Always auto-continue policy runs past host calls", async ({
    page,
  }) => {
    await loadTraceProgram(page);
    await setAutoContinuePolicy(page, "always_continue");

    // Click Run — should auto-continue past all host calls
    await page.getByTestId("run-button").click();

    // Let it run for a bit — long enough to hit at least one host call.
    // With "never" policy, this would stop on "Host Call" quickly.
    // With "always_continue", it should keep going.
    await page.waitForTimeout(3000);

    // Either execution completed (run-button reappears) or still running (pause-button visible).
    // If still running, click Pause to stop.
    const pauseBtn = page.getByTestId("pause-button");
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      // Wait for pause to take effect
      await page.waitForTimeout(500);
    }

    // The PVM should NOT be stuck on "Host Call" — it auto-continued past them.
    // Status should be OK (paused normally) or completed.
    const status = await pvmStatus(page).textContent();
    expect(status).not.toBe("Host Call");
  });

  test("Run with Never policy stops on host calls", async ({ page }) => {
    await loadTraceProgram(page);
    await setAutoContinuePolicy(page, "never");

    // Click Run — should stop on the first host call
    await page.getByTestId("run-button").click();

    // Status should show "Host Call" — Run loop stopped
    await expect(pvmStatus(page)).toHaveText("Host Call", { timeout: 15000 });

    // Run button should not be in "pause" state (run loop exited)
    // The Next button should be enabled (can resume)
    await expect(page.getByTestId("next-button")).toBeEnabled();

    // Execution complete badge should NOT be visible (we stopped, not completed)
    await expect(
      page.getByTestId("execution-complete-badge"),
    ).not.toBeVisible();
  });
});
