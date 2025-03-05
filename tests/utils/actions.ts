import { Page } from "@playwright/test";

export const openDebugger = async (page: Page) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.clear());
};

export const openProgram = async (page: Page, name: string) => {
  await page.click(`div[id="${name}"]`);

  await page.waitForTimeout(1000);
};

export const step = async (page: Page) => {
  await page.getByRole("button", { name: "Step" }).click();
};

export const selectPVM = async (page: Page, pvmType: string) => {
  await page.waitForSelector('button[test-id="pvm-select"]');
  await page.click('button[test-id="pvm-select"]');

  await page.waitForSelector('[role="dialog"]');

  // Locate all options in the multi-select
  const allPvmOptions = await page.locator('div[role="option"]');

  // Check for selected options
  const selectedPvmOptions = allPvmOptions.locator(".bg-brand"); // Adjust the class name as needed
  const selectedPvmCount = await selectedPvmOptions.count();

  for (let i = 0; i < selectedPvmCount; i++) {
    const pvm = selectedPvmOptions.nth(i);
    await pvm.click(); // Click to unselect the checkbox
  }

  const pvmOption = page.locator('div[role="option"]', { hasText: new RegExp(pvmType, "i") });
  await pvmOption.waitFor({ state: "visible" });
  await pvmOption.click();

  await page.waitForTimeout(1000);
  await page.locator("html").click();
};
