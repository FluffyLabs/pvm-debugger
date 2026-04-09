import { expect, test } from "@playwright/test";

const SPI_EXAMPLES: Record<string, string> = {
  "add-jam": "wat",
  "fibonacci-jam": "wat",
  "as-add": "assemblyscript",
};

async function loadProgram(
  page: import("@playwright/test").Page,
  exampleId = "fibonacci",
) {
  await page.goto("/#/load");
  const categoryId = SPI_EXAMPLES[exampleId];
  if (categoryId) {
    await page.getByTestId(`category-toggle-${categoryId}`).click();
  }
  const card = page.getByTestId(`example-card-${exampleId}`);
  await expect(card).toBeVisible();
  await card.click();
  if (categoryId) {
    await expect(page.getByTestId("config-step")).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId("config-step-load").click();
  }
  await expect(page.getByTestId("debugger-page")).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Sprint 28 — ASM/Raw Toggle + Binary Popover", () => {
  test("ASM mode shows omega notation", async ({ page }) => {
    await loadProgram(page, "add-jam");

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // ASM should be active by default
    const asmBtn = page.getByTestId("display-mode-asm");
    await expect(asmBtn).toBeVisible();

    // Instruction args should contain omega notation
    const argsElements = panel.locator("[data-testid='instruction-args']");
    const count = await argsElements.count();
    expect(count).toBeGreaterThan(0);

    // At least one arg should contain omega (ω) character
    let hasOmega = false;
    for (let i = 0; i < count; i++) {
      const text = await argsElements.nth(i).textContent();
      if (text?.includes("ω")) {
        hasOmega = true;
        break;
      }
    }
    expect(hasOmega).toBe(true);
  });

  test("toggling to Raw mode changes displayed text", async ({ page }) => {
    await loadProgram(page, "add-jam");

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // Verify mnemonics are visible in ASM mode
    const mnemonics = panel.locator("[data-testid='instruction-mnemonic']");
    const mnemCount = await mnemonics.count();
    expect(mnemCount).toBeGreaterThan(0);

    // Switch to Raw mode
    await page.getByTestId("display-mode-raw").click();

    // Mnemonics should no longer be visible
    const mnemonicsAfter = panel.locator(
      "[data-testid='instruction-mnemonic']",
    );
    expect(await mnemonicsAfter.count()).toBe(0);

    // Raw bytes should be visible instead
    const rawBytes = panel.locator("[data-testid='instruction-raw-bytes']");
    const rawCount = await rawBytes.count();
    expect(rawCount).toBeGreaterThan(0);

    // Raw bytes should contain hex characters
    const firstRaw = await rawBytes.first().textContent();
    expect(firstRaw).toMatch(/^[0-9A-F]{2}( [0-9A-F]{2})*$/);
  });

  test("toggling back to ASM restores omega notation", async ({ page }) => {
    await loadProgram(page, "add-jam");

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // Switch to Raw
    await page.getByTestId("display-mode-raw").click();
    expect(
      await panel.locator("[data-testid='instruction-mnemonic']").count(),
    ).toBe(0);

    // Switch back to ASM
    await page.getByTestId("display-mode-asm").click();

    // Mnemonics should be back
    const mnemonics = panel.locator("[data-testid='instruction-mnemonic']");
    expect(await mnemonics.count()).toBeGreaterThan(0);

    // Omega notation should be present in args
    const argsElements = panel.locator("[data-testid='instruction-args']");
    const count = await argsElements.count();
    let hasOmega = false;
    for (let i = 0; i < count; i++) {
      const text = await argsElements.nth(i).textContent();
      if (text?.includes("ω")) {
        hasOmega = true;
        break;
      }
    }
    expect(hasOmega).toBe(true);
  });

  test("clicking an instruction opens the binary popover", async ({ page }) => {
    await loadProgram(page, "add-jam");

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // Find a visible instruction trigger and click it
    const triggers = panel.locator("[data-testid^='instruction-trigger-']");
    const triggerCount = await triggers.count();
    expect(triggerCount).toBeGreaterThan(0);

    await triggers.first().click();

    // The popover should appear
    const popover = page.getByTestId("instruction-binary-popover");
    await expect(popover).toBeVisible();
  });

  test("the popover shows raw bytes and opcode", async ({ page }) => {
    await loadProgram(page, "add-jam");

    const panel = page.getByTestId("instructions-panel");
    await expect(panel).toBeVisible();

    // Click the first instruction trigger
    const triggers = panel.locator("[data-testid^='instruction-trigger-']");
    await triggers.first().click();

    // Verify popover content
    const popover = page.getByTestId("instruction-binary-popover");
    await expect(popover).toBeVisible();

    // Raw bytes should be present
    const rawBytes = page.getByTestId("popover-raw-bytes");
    await expect(rawBytes).toBeVisible();
    const bytesText = await rawBytes.textContent();
    expect(bytesText).toMatch(/^[0-9A-F]{2}( [0-9A-F]{2})*$/);

    // Opcode should be present with both decimal and hex
    const opcode = page.getByTestId("popover-opcode");
    await expect(opcode).toBeVisible();
    const opcodeText = await opcode.textContent();
    expect(opcodeText).toMatch(/\d+ \(0x[0-9A-F]{2}\)/);
  });
});
