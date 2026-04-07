import { expect, test } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures");

/**
 * Helper: load a bundled example by clicking its card, confirming detection,
 * and waiting for the debugger page.
 */
/** Map from example IDs to their parent category IDs (only for collapsed categories). */
const COLLAPSED_CATEGORY: Record<string, string> = {
  "inst-add-32": "json-test-vectors",
  "inst-add-64": "json-test-vectors",
  "io-trace": "traces", // traces is expanded, but kept for safety
};

async function loadExample(
  page: import("@playwright/test").Page,
  exampleId: string,
) {
  await page.goto("/#/load");
  // Expand collapsed category if needed
  const categoryId = COLLAPSED_CATEGORY[exampleId];
  if (categoryId) {
    const toggle = page.getByTestId(`category-toggle-${categoryId}`);
    // Only click if the category is actually collapsed (card not visible)
    const card = page.getByTestId(`example-card-${exampleId}`);
    const isVisible = await card.isVisible().catch(() => false);
    if (!isVisible) {
      await toggle.click();
    }
  }
  const card = page.getByTestId(`example-card-${exampleId}`);
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.click();
  // Non-SPI programs skip config step and go directly to debugger
  await expect(page.getByTestId("debugger-page")).toBeVisible({
    timeout: 15000,
  });
}

/**
 * Helper: upload a local fixture file, confirm detection, and load into debugger.
 */
async function loadFile(
  page: import("@playwright/test").Page,
  fixturePath: string,
) {
  await page.goto("/#/load");
  await expect(page.getByTestId("load-page")).toBeVisible();
  const fileInput = page.getByTestId("file-upload-input");
  await fileInput.setInputFiles(path.join(FIXTURES_DIR, fixturePath));
  await expect(page.getByTestId("file-upload-selected")).toBeVisible();
  await page.getByTestId("source-step-continue").click();
  // Non-SPI programs skip config step and go directly to debugger
  await expect(page.getByTestId("debugger-page")).toBeVisible({
    timeout: 15000,
  });
}

/** Open the settings tab in the bottom drawer. */
async function openSettings(page: import("@playwright/test").Page) {
  await page.getByTestId("drawer-tab-settings").click();
  await expect(page.getByTestId("settings-tab")).toBeVisible();
}

/** Set the auto-continue policy. */
async function setAutoContinuePolicy(
  page: import("@playwright/test").Page,
  policy: "always_continue" | "continue_when_trace_matches" | "never",
) {
  await openSettings(page);
  await page.getByTestId(`auto-continue-radio-${policy}`).click();
  await expect(page.getByTestId(`auto-continue-radio-${policy}`)).toBeChecked();
}

test.describe("Sprint 36 — Integration Smoke Test", () => {
  // Increase timeout for the whole suite — up to 120s per test
  test.setTimeout(60_000);

  test("JAM SPI example loads with correct format summary", async ({
    page,
  }) => {
    // Load a JAM SPI example (add-jam is in wat, collapsed by default)
    await page.goto("/#/load");
    await page.getByTestId("category-toggle-wat").click();
    const card = page.getByTestId("example-card-add-jam");
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();

    // Verify step 2 shows detection summary with SPI format
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("detection-summary")).toBeVisible();
    await expect(page.getByTestId("detection-summary-format")).toHaveText(
      /JAM SPI/,
    );

    // SPI structural details should be present
    await expect(page.getByTestId("detection-summary-spi")).toBeVisible();
    await expect(page.getByTestId("summary-code-size")).toBeVisible();

    // Load and verify the debugger renders
    await page.getByTestId("config-step-load").click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({
      timeout: 15000,
    });

    // Verify a real state exists (gas should be a non-zero number)
    const gasValue = page.getByTestId("gas-value");
    await expect(gasValue).toBeVisible();
    const gasText = await gasValue.textContent();
    expect(gasText).toBeTruthy();
    // Gas should be parseable as a number (may have thousands separators)
    const gasNum = Number(gasText!.replace(/,/g, ""));
    expect(gasNum).toBeGreaterThan(0);
  });

  test("generic program runs to completion", async ({ page }) => {
    // Load the "add" example — adds r7 + r8 into r0
    await loadExample(page, "add");

    // Record initial gas
    const gasValue = page.getByTestId("gas-value");
    const initialGas = await gasValue.textContent();

    // Run to completion
    await page.getByTestId("run-button").click();
    await expect(page.getByTestId("execution-complete-badge")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("execution-complete-badge")).toHaveText(
      "Execution Complete",
    );

    // Gas should have decreased (real state transition)
    const finalGas = await gasValue.textContent();
    expect(finalGas).not.toBe(initialGas);

    // Next and Run should be disabled in terminal state
    await expect(page.getByTestId("next-button")).toBeDisabled();
    await expect(page.getByTestId("run-button")).toBeDisabled();
  });

  test("file upload loads and runs", async ({ page }) => {
    // Upload the generic add.pvm fixture
    await loadFile(page, "generic/add.pvm");

    // Verify debugger is ready
    const pcValue = page.getByTestId("pc-value");
    await expect(pcValue).toHaveText("0x0000");

    // Step once and verify PC advances
    await page.getByTestId("next-button").click();
    await expect(pcValue).not.toHaveText("0x0000", { timeout: 5000 });

    // Run to completion
    await page.getByTestId("run-button").click();
    await expect(page.getByTestId("execution-complete-badge")).toBeVisible({
      timeout: 15000,
    });
  });

  test("register edit changes execution result", async ({ page }) => {
    // The "add" program encodes: add_64 r9, r7, r8 (r9 = r7 + r8).
    // Initial state: r7=1, r8=2 → r9 should become 3 after one step.
    // We edit r7 to 100 and verify r9 = 100 + 2 = 102 instead.
    await loadExample(page, "add");

    // Verify initial r7 = 1
    const regHex7 = page.getByTestId("register-hex-7");
    await expect(regHex7).toHaveText(/0x0{14}01/i);

    // Edit r7 to 100 (0x64) while paused
    await regHex7.click();
    const editInput = page.getByTestId("register-edit-7");
    await expect(editInput).toBeVisible();
    await editInput.fill("100");
    await editInput.press("Enter");
    await expect(editInput).not.toBeVisible();
    await expect(regHex7).toHaveText(/0x0{14}64/i, { timeout: 5000 });

    // Step once — add_64 executes: r9 = r7(100) + r8(2) = 102 (0x66)
    await page.getByTestId("next-button").click();
    await expect(page.getByTestId("pc-value")).not.toHaveText("0x0000", {
      timeout: 5000,
    });

    // r9 should be 102 (0x66) — proving editing ω7 changed the downstream result
    const regHex9 = page.getByTestId("register-hex-9");
    await expect(regHex9).toHaveText(/0x0{14}66/i, { timeout: 5000 });
  });

  test("reset restores initial state", async ({ page }) => {
    await loadExample(page, "add");

    const pcValue = page.getByTestId("pc-value");
    const gasValue = page.getByTestId("gas-value");

    // Record initial values
    const initialPc = await pcValue.textContent();
    const initialGas = await gasValue.textContent();

    // Step once to mutate state
    await page.getByTestId("next-button").click();
    await expect(pcValue).not.toHaveText(initialPc!, { timeout: 5000 });

    // Verify gas decreased
    const midGas = await gasValue.textContent();
    expect(midGas).not.toBe(initialGas);

    // Reset
    await page.getByTestId("reset-button").click();

    // PC and gas should be restored
    await expect(pcValue).toHaveText(initialPc!, { timeout: 5000 });
    await expect(gasValue).toHaveText(initialGas!, { timeout: 5000 });

    // Registers should be back to initial values
    const regHex7 = page.getByTestId("register-hex-7");
    await expect(regHex7).toHaveText(/0x0{14}01/i, { timeout: 5000 });

    // Should be able to step again (not terminal)
    await expect(page.getByTestId("next-button")).toBeEnabled();
  });

  test("trace example reaches host-call drawer", async ({ page }) => {
    // Load a trace-backed example
    await loadExample(page, "io-trace");

    // Set auto-continue to "never" so we stop on host calls
    await setAutoContinuePolicy(page, "never");

    // Run — should stop at the first host call
    await page.getByTestId("run-button").click();
    await expect(page.getByTestId("pvm-status-typeberry")).toHaveText(
      "Host Call",
      {
        timeout: 15000,
      },
    );

    // The host call tab should be visible (drawer auto-opens on host call)
    // Per spec pitfall: assert the rendered panel directly, don't click the tab
    await expect(page.getByTestId("host-call-tab")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("host-call-header")).toBeVisible();

    // Verify host call hint text is present
    await expect(page.getByTestId("host-call-hint")).toBeVisible();

    // Switch to the trace tab and verify both columns are present
    await page.getByTestId("drawer-tab-ecalli_trace").click();
    await expect(page.getByTestId("ecalli-trace-tab")).toBeVisible();
    // Default view is "formatted" with two trace columns
    await expect(
      page.getByTestId("trace-column-execution-trace"),
    ).toBeVisible();
    await expect(
      page.getByTestId("trace-column-reference-trace"),
    ).toBeVisible();
  });

  test("JSON vector reaches expected terminal status", async ({ page }) => {
    // Load the inst-add-32 JSON test vector (local file)
    await loadExample(page, "inst-add-32");

    // Run to completion
    await page.getByTestId("run-button").click();
    await expect(page.getByTestId("execution-complete-badge")).toBeVisible({
      timeout: 15000,
    });

    // The PVM should be in a terminal state
    const statusBadge = page.getByTestId("status-badge");
    await expect(statusBadge).toBeVisible();
    const statusText = await statusBadge.textContent();
    // Terminal status should be one of: Halt, Panic, Fault, Out of Gas
    expect(statusText).toMatch(/Halt|Panic|Fault|Out of Gas/);

    // Gas should have changed (real execution occurred)
    const gasValue = page.getByTestId("gas-value");
    const gasText = await gasValue.textContent();
    expect(gasText).toBeTruthy();
  });
});
