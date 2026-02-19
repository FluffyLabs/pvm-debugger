import { Page } from "@playwright/test";

export const openDebugger = async (page: Page) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
};

export const openProgram = async (page: Page, name: string) => {
  await page.click(`div[id="${name}"]`);

  await page.waitForTimeout(1000);
};

export const step = async (page: Page) => {
  await page.getByRole("button", { name: "Step" }).click();
};

export const selectPVM = async (page: Page, pvmType: string) => {
  await page.waitForSelector('button[data-testid="pvm-select"]');
  await page.click('button[data-testid="pvm-select"]');

  await page.waitForSelector('[role="dialog"]');

  // Locate all options in the multi-select
  const allPvmOptions = page.locator('div[role="option"]');
  const count = await allPvmOptions.count();

  for (let i = 0; i < count; i++) {
    const option = allPvmOptions.nth(i);
    const text = await option.textContent();
    const isTarget = text?.match(new RegExp(pvmType, "i"));
    const isSelected = (await option.locator(".bg-brand").count()) > 0;

    if (isTarget) {
      if (!isSelected) {
        await option.click();
      }
    } else {
      if (isSelected) {
        await option.click();
      }
    }
  }

  await page.waitForTimeout(1000);
  await page.locator("html").click();
};
