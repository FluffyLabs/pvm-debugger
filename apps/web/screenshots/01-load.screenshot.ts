import path from "node:path";
import { fileURLToPath } from "node:url";
import { capture, expect, settle, test } from "./helpers";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, "..", "..", "..", "fixtures");

test.describe("Load screens", () => {
  test("load-examples: bundled example browser", async ({ page }) => {
    await page.goto("/#/load");
    await page.getByTestId("load-page").waitFor();
    // Expand WAT and JSON categories so more examples are visible in the shot.
    await page.getByTestId("category-toggle-wat").click();
    await page.getByTestId("category-toggle-json-test-vectors").click();
    await settle(page);
    await capture(page, "load-examples.png");
  });

  test("load-upload: uploaded file selected", async ({ page }) => {
    await page.goto("/#/load");
    await page.getByTestId("load-page").waitFor();
    const input = page.getByTestId("file-upload-input");
    await input.setInputFiles(path.join(FIXTURES, "generic", "branch.pvm"));
    await expect(page.getByTestId("file-upload-selected")).toBeVisible();
    await settle(page);
    await capture(page, "load-upload.png");
  });

  test("load-url: URL field filled", async ({ page }) => {
    await page.goto("/#/load");
    await page.getByTestId("load-page").waitFor();
    await page
      .getByTestId("url-input-field")
      .fill(
        "https://github.com/FluffyLabs/pvm-debugger/blob/main/fixtures/generic/branch.pvm",
      );
    await settle(page);
    await capture(page, "load-url.png");
  });

  test("load-manual: hex input filled", async ({ page }) => {
    await page.goto("/#/load");
    await page.getByTestId("load-page").waitFor();
    await page
      .getByTestId("manual-input-field")
      .fill("0x00 03 00 01 00 0d 00 08 00 02 00 07 00 01");
    // Blur so the byte count appears.
    await page.getByTestId("manual-input-field").blur();
    await settle(page);
    await capture(page, "load-manual.png");
  });
});
