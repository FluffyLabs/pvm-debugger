import { test, expect, Page } from "@playwright/test";

async function runProgramTest(page: Page, pvmType: string) {
  // Navigate to your app
  await page.goto("/");

  const selectedPvms = page.locator('button[test-id="pvm-select"] .rounded-full');

  // Iterate over the selected PVMs and check for given text
  const pvmTextToFind = pvmType;
  const pvmCount = await selectedPvms.count();
  let found = false;

  for (let i = 0; i < pvmCount; i++) {
    const pvmText = await selectedPvms.nth(i).innerText();
    if (pvmText.includes(pvmTextToFind)) {
      found = true;
      break;
    } else {
      await page.waitForSelector('button[test-id="pvm-select"]');
      await page.click('button[test-id="pvm-select"] svg');
    }
  }

  if (!found) {
    // Select the PVM type
    await page.waitForSelector('button[test-id="pvm-select"]');

    await page.click('button[test-id="pvm-select"]');

    const pvmOption = page.locator('div[role="option"]', { hasText: new RegExp(pvmType, "i") });
    await pvmOption.waitFor({ state: "visible" });
    await pvmOption.click();
  }

  // Wait for the ProgramUpload component to be visible
  await page.waitForSelector('button:has-text("Load")');

  // Click the Load Program button
  await page.click('button:has-text("Load")');

  // Wait for the program to load
  await page.waitForTimeout(1000);

  await page.click('button:has-text("Examples")');
  await page.click('button[id="option-fibonacci"]');
  await page.click('button[id="load-button"]');

  await page.waitForTimeout(1000);

  const jumpIndInstruction = page.locator('span:has-text("JUMP_IND")');
  await expect(jumpIndInstruction).toBeVisible();

  // Test the "Run" button functionality
  await page.click('button:has-text("Run")');

  // Wait for execution to complete
  await page.waitForTimeout(5000);

  const programStatus = page.locator('[test-id="program-status"]');
  await expect(programStatus).toHaveText("HALT");

  // const jumpIndInstructionParent = page.locator('div[test-id="instruction-item"]:has(span:has-text("JUMP_IND"))');
  // await expect(jumpIndInstructionParent).toHaveCSS('background-color', 'rgb(76, 175, 80)');
}

test("Run program with typeberry PVM", async ({ page }) => {
  await runProgramTest(page, "@typeberry");
});

test("Run program with polkavm PVM", async ({ page }) => {
  await runProgramTest(page, "polkavm");
});
