import { test, expect, Page } from "@playwright/test";
import { openDebugger, openProgram, selectPVM } from "./utils/actions";

async function runProgramTest(page: Page, pvmType: string) {
  await openDebugger(page);
  await selectPVM(page, pvmType);
  await openProgram(page, "fibonacci");

  const jumpIndInstruction = page.locator('a:has-text("JUMP_IND")');
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
