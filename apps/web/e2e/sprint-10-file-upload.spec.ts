import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures");

test.describe("Sprint 10 — File Upload Source", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/load");
    await expect(page.getByTestId("load-page")).toBeVisible();
  });

  test("two-column layout renders (upload left, examples right)", async ({ page }) => {
    await expect(page.getByTestId("load-page-columns")).toBeVisible();
    await expect(page.getByTestId("load-page-left")).toBeVisible();
    await expect(page.getByTestId("load-page-right")).toBeVisible();

    // Source step and example list are in separate columns
    await expect(page.getByTestId("source-step")).toBeVisible();
    await expect(page.getByTestId("example-list")).toBeVisible();
  });

  test("file picker upload shows filename and byte count", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "generic/add.pvm"));

    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await expect(page.getByTestId("file-upload-name")).toHaveText("add.pvm");
    await expect(page.getByTestId("file-upload-size")).toBeVisible();
    // Byte count text should contain a number and unit
    const sizeText = await page.getByTestId("file-upload-size").textContent();
    expect(sizeText).toMatch(/\d+(\.\d+)?\s*(B|KB|MB)/);
  });

  test("format badge shown after file selection", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "generic/add.pvm"));

    const formatBadge = page.getByTestId("file-upload-format");
    await expect(formatBadge).toBeVisible();
    // add.pvm is a generic PVM file
    await expect(formatBadge).toHaveText("Generic");
  });

  test("Continue button appears and enables after file selection", async ({ page }) => {
    const continueBtn = page.getByTestId("source-step-continue");

    // Continue button exists but is disabled before file selection
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn).toBeDisabled();

    // Select a file
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "generic/add.pvm"));

    // Now Continue should be enabled
    await expect(continueBtn).toBeEnabled();
  });

  test("Continue loads the program and navigates to debugger", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "generic/add.pvm"));

    const continueBtn = page.getByTestId("source-step-continue");
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  });

  test("clearing file re-disables Continue", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "generic/add.pvm"));

    await expect(page.getByTestId("source-step-continue")).toBeEnabled();

    // Clear the selected file
    await page.getByTestId("file-upload-clear").click();

    // Continue should be disabled again and dropzone should reappear
    await expect(page.getByTestId("source-step-continue")).toBeDisabled();
    await expect(page.getByTestId("file-upload-dropzone")).toBeVisible();
  });

  test("JSON test vector file is detected correctly", async ({ page }) => {
    const fileInput = page.getByTestId("file-upload-input");
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "json/inst_add_32.json"));

    await expect(page.getByTestId("file-upload-format")).toHaveText("JSON");
  });

  test("narrow viewport stacks columns vertically", async ({ page }) => {
    // Resize to narrow viewport (below md breakpoint = 768px)
    await page.setViewportSize({ width: 500, height: 800 });

    const columns = page.getByTestId("load-page-columns");
    await expect(columns).toBeVisible();

    // In narrow viewport the grid should be single column.
    // Verify both left and right columns are visible (stacked).
    const left = page.getByTestId("load-page-left");
    const right = page.getByTestId("load-page-right");
    await expect(left).toBeVisible();
    await expect(right).toBeVisible();

    // Left column should appear above right column (stacked)
    const leftBox = await left.boundingBox();
    const rightBox = await right.boundingBox();
    expect(leftBox).toBeTruthy();
    expect(rightBox).toBeTruthy();
    // In stacked layout, the left column top should be above right column top
    expect(leftBox!.y).toBeLessThan(rightBox!.y);
  });

  test("example cards still work in two-column layout", async ({ page }) => {
    // Verify that clicking an example in the right column still works
    const card = page.getByTestId("example-card-add");
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByTestId("debugger-page")).toBeVisible({ timeout: 15000 });
  });
});
