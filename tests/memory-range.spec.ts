import { test, expect } from "@playwright/test";
import { openDebugger, openProgram, selectPVM, step } from "./utils/actions";

test("Should modify memory ranges", async ({ page }) => {
  await openDebugger(page);
  await selectPVM(page, "@typeberry");
  await openProgram(page, "storeU16");

  await page.getByRole("tab", { name: "Ranges" }).click();
  await page.getByLabel("Start").click();
  await page.getByLabel("Start").fill("131072");
  await page
    .locator("div")
    .filter({ hasText: /^StartLength$/ })
    .getByRole("button")
    .click();

  await expect(page.locator("span > button").first()).toContainText("00");
  await expect(page.locator("button:nth-child(2) > .relative > span > button").first()).toContainText("00");

  await step(page);

  await expect(page.locator("span > button").first()).toContainText("78", { timeout: 2000 });
  await expect(page.locator("button:nth-child(2) > .relative > span > button").first()).toContainText("56", {
    timeout: 20000,
  });
});

test("Should show interpretations", async ({ page }) => {
  await openDebugger(page);
  await selectPVM(page, "@typeberry");
  await openProgram(page, "storeU16");

  await page.getByRole("tab", { name: "Ranges" }).click();
  await page.getByLabel("Start").click();
  await page.getByLabel("Start").fill("131072");
  await page
    .locator("div")
    .filter({ hasText: /^StartLength$/ })
    .getByRole("button")
    .click();

  await step(page);

  await page.getByText("78", { exact: true }).click();

  await expect(page.getByText("Open codec tooli8 : 0x78 0x56")).toBeVisible();
});

test("Should not show interpretations for longer memory chunks", async ({ page }) => {
  await openDebugger(page);
  await selectPVM(page, "@typeberry");
  await openProgram(page, "storeU16");

  await page.getByRole("tab", { name: "Ranges" }).click();
  await page.getByLabel("Start").click();
  await page.getByLabel("Start").fill("131072");
  await page.getByLabel("Length").click();
  await page.getByLabel("Length").fill("40");

  await page
    .locator("div")
    .filter({ hasText: /^StartLength$/ })
    .getByRole("button")
    .click();

  await step(page);

  await page.getByText("78", { exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Max memory for interpretations is 32 bytes");
});

test("Should show diffs between PVMs", async ({ page }) => {
  await openDebugger(page);
  await selectPVM(page, "typeberry");
  await openProgram(page, "storeU16");

  await page.getByRole("tab", { name: "Ranges" }).click();
  await page.getByLabel("Start").click();
  await page.getByLabel("Start").fill("131072");
  await page.getByLabel("Length").click();
  await page.getByLabel("Length").fill("40");

  await page
    .locator("div")
    .filter({ hasText: /^StartLength$/ })
    .getByRole("button")
    .click();

  await step(page);

  await page.getByText("78", { exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Max memory for interpretations is 32 bytes");
});
