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
 * Fetch host-call and ecalli-trace screenshots. The `io-trace` example is a
 * short typeberry test trace that starts with a fetch (ecalli=1) — good for
 * showing the redesigned fetch handler on the first pause.
 */

async function loadIoTrace(page: Page) {
  await page.goto("/#/load");
  await page.getByTestId("example-card-io-trace").click();
  await expect(page.getByTestId("debugger-page")).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Fetch host call and trace", () => {
  test("host-call-fetch: struct-mode editor with slice preview", async ({
    page,
  }) => {
    await loadIoTrace(page);
    await setAutoContinueNever(page);
    await runToHostCall(page);
    // Advance until a fetch host call is active.
    for (let i = 0; i < 30; i++) {
      const fetchVisible = await page
        .getByTestId("fetch-host-call")
        .isVisible()
        .catch(() => false);
      if (fetchVisible) break;
      if (!(await advanceToNextHostCall(page))) break;
    }
    await expect(page.getByTestId("fetch-host-call")).toBeVisible();
    // Prefer struct mode if available.
    const structTab = page.getByTestId("fetch-mode-struct");
    if (await structTab.isVisible().catch(() => false)) {
      const disabled = await structTab.isDisabled().catch(() => false);
      if (!disabled) await structTab.click();
    }
    await settle(page);
    await capture(page, "host-call-fetch.png");
  });

  test("trace-comparison: side-by-side execution vs reference", async ({
    page,
  }) => {
    await loadIoTrace(page);
    await setAutoContinueNever(page);
    // Advance through one host call so the execution column has at least one
    // entry alongside the reference trace.
    await runToHostCall(page);
    await advanceToNextHostCall(page);
    await page.getByTestId("drawer-tab-ecalli_trace").click();
    await expect(page.getByTestId("ecalli-trace-tab")).toBeVisible();
    await settle(page);
    await capture(page, "trace-comparison.png");
  });
});
