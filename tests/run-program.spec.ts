import { test, expect, Page } from "@playwright/test";

async function runProgramTest(page: Page, pvmType: string) {
  // Navigate to your app
  await page.goto("/");

  await page.waitForSelector('button[test-id="pvm-select"]');
  await page.click('button[test-id="pvm-select"]');

  await page.waitForSelector(".text-popover-foreground");

  // Locate all options in the multi-select
  const allPvmOptions = page.locator('div[role="option"]');

  // Check for selected options
  const selectedPvmOptions = allPvmOptions.locator(".bg-primary"); // Adjust the class name as needed
  const selectedPvmCount = await selectedPvmOptions.count();

  for (let i = 0; i < selectedPvmCount; i++) {
    const pvm = selectedPvmOptions.nth(i);
    await pvm.click(); // Click to unselect the checkbox
  }

  const pvmOption = page.locator('div[role="option"]', { hasText: new RegExp(pvmType, "i") });
  await pvmOption.waitFor({ state: "visible" });
  await pvmOption.click();

  // Note: Do not click now on load button as initial page shows options already

  // Wait for the ProgramUpload component to be visible
  // await page.waitForSelector('button:has-text("Load")');

  // Click the Load Program button
  // await page.click('button:has-text("Load")');

  // Wait for the program to load
  await page.waitForTimeout(1000);

  await page.click('button[id="fibonacci"]');

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
