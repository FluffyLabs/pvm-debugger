import { capture, expect, settle, test } from "./helpers";

test.describe("Config step", () => {
  test("config-jam-builder: JAM SPI builder mode", async ({ page }) => {
    await page.goto("/#/load");
    await page.getByTestId("category-toggle-wat").click();
    await page.getByTestId("example-card-add-jam").click();
    await expect(page.getByTestId("config-step")).toBeVisible();
    await settle(page);
    await capture(page, "config-jam-builder.png");
  });

  test("config-jam-raw: JAM SPI raw mode", async ({ page }) => {
    await page.goto("/#/load");
    await page.getByTestId("category-toggle-wat").click();
    await page.getByTestId("example-card-add-jam").click();
    await expect(page.getByTestId("config-step")).toBeVisible();
    await page.getByTestId("spi-raw-mode-switch").click();
    await expect(page.getByTestId("spi-raw-hex")).toBeVisible();
    await settle(page);
    await capture(page, "config-jam-raw.png");
  });
});
