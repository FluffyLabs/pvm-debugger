import type { Page } from "@playwright/test";
import {
  advanceToNextHostCall,
  capture,
  expect,
  runToHostCall,
  setAutoContinueNever,
  settle,
  test,
} from "./helpers";

/**
 * Screenshots of the sprint-42 redesigned host-call drawer.
 *
 * Fixture choices:
 *  - `io-trace` — short trace, first host call is `fetch`. Used for the
 *    two-column overview and the pending-changes banner.
 *  - `all-ecalli-accumulate` — exercises every host-call kind; hits a `log`
 *    call within the first few pauses.
 */

async function loadTraceExample(page: Page, id: "io-trace") {
  await page.goto("/#/load");
  await page.getByTestId(`example-card-${id}`).click();
  await expect(page.getByTestId("debugger-page")).toBeVisible({
    timeout: 15000,
  });
}

async function loadAllEcalliAccumulate(page: Page) {
  await page.goto("/#/load");
  await page.getByTestId("example-card-all-ecalli-accumulate").click();
  await expect(page.getByTestId("config-step")).toBeVisible({ timeout: 15000 });
  const loadBtn = page.getByTestId("config-step-load");
  await expect(loadBtn).toBeEnabled({ timeout: 10000 });
  await loadBtn.click();
  await expect(page.getByTestId("debugger-page")).toBeVisible({
    timeout: 30000,
  });
}

test.describe("Host call drawer", () => {
  test("host-call-overview: redesigned two-column layout", async ({ page }) => {
    await loadTraceExample(page, "io-trace");
    await setAutoContinueNever(page);
    await runToHostCall(page);
    await settle(page);
    await capture(page, "host-call-overview.png");
  });

  test("host-call-log: decoded log message", async ({ page }) => {
    await loadAllEcalliAccumulate(page);
    await setAutoContinueNever(page);
    await runToHostCall(page);
    for (let i = 0; i < 30; i++) {
      const logVisible = await page
        .getByTestId("log-host-call")
        .isVisible()
        .catch(() => false);
      if (logVisible) break;
      if (!(await advanceToNextHostCall(page))) break;
    }
    await expect(page.getByTestId("log-host-call")).toBeVisible();
    await settle(page);
    await capture(page, "host-call-log.png");
  });

  test("host-call-pending-changes: banner with arrow notation", async ({
    page,
  }) => {
    await loadTraceExample(page, "io-trace");
    await setAutoContinueNever(page);
    await runToHostCall(page);
    // Pending-changes is debounced; give it a moment before checking.
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      const pendingVisible = await page
        .getByTestId("pending-changes")
        .isVisible()
        .catch(() => false);
      if (pendingVisible) break;
      if (!(await advanceToNextHostCall(page))) break;
    }
    await expect(page.getByTestId("pending-changes")).toBeVisible();
    await settle(page);
    await capture(page, "host-call-pending-changes.png");
  });
});
