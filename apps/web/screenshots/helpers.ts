import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";
import { test as base } from "@playwright/test";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Root folder where screenshots end up. Resolved once so all specs agree.
 * `HERE` is apps/web/screenshots; climb three levels to the repo root.
 */
export const SCREENSHOT_DIR = resolve(
  HERE,
  "..",
  "..",
  "..",
  "docs",
  "usage-screenshots",
);

/**
 * Resolve a screenshot filename to its final on-disk path.
 */
export function screenshotPath(name: string): string {
  const path = resolve(SCREENSHOT_DIR, name);
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return path;
}

/**
 * Wait for web fonts to finish loading so Poppins/Inconsolata render
 * consistently between runs.
 */
export async function waitForFontsReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });
}

/**
 * A small settle delay for animated UI (Vaul drawers, tab underlines).
 * Playwright's screenshot stabilization handles most of this, but a tiny
 * buffer avoids flaky captures of mid-transition states.
 */
export async function settle(page: Page, ms = 250): Promise<void> {
  await page.waitForTimeout(ms);
}

/**
 * Playwright test fixture preset to dark mode.
 *
 * Injects `localStorage.theme-mode = "dark"` before any page code runs,
 * so the shared-ui `initializeTheme()` picks it up on boot.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("theme-mode", "dark");
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";

/**
 * Capture either the full page or a specific locator, writing under
 * docs/usage-screenshots/ with the given filename.
 */
export async function capture(
  target: Page | Locator,
  name: string,
): Promise<void> {
  const path = screenshotPath(name);
  if ("screenshot" in target && "evaluate" in target) {
    const page = target as Page;
    await waitForFontsReady(page);
    await page.screenshot({ path, fullPage: false, animations: "disabled" });
  } else {
    await (target as Locator).screenshot({ path, animations: "disabled" });
  }
}

// ---------------------------------------------------------------------------
// Host-call navigation helpers.
//
// Why these live here and not inline in each spec: advancing between
// host-call pauses has two non-obvious traps that bit me during this sprint.
//
//  1. `Next` advances ONE instruction. After resuming a host call, the next
//     instruction is rarely another ecalli, so `Next` lands on a regular
//     paused state instead of the next host-call. Use `Run` with
//     `autoContinuePolicy=never` — Run stops automatically at every host
//     call.
//  2. `pvm-status-typeberry` text can stay on "Host Call" across the
//     transition from one pause to the next. To detect that execution
//     actually advanced, diff the PC value from `pc-value`.
// ---------------------------------------------------------------------------

/** Read the current PC from the status header; null if it isn't rendered. */
export async function currentPc(page: Page): Promise<string | null> {
  return await page
    .getByTestId("pc-value")
    .textContent()
    .catch(() => null);
}

/**
 * Set the host-call auto-continue policy to "Never (Manual)". Opens the
 * Settings drawer if needed and verifies the radio is checked after the
 * click.
 */
export async function setAutoContinueNever(page: Page): Promise<void> {
  await page.getByTestId("drawer-tab-settings").click();
  const radio = page.getByTestId("auto-continue-radio-never");
  await radio.click();
  // Fail fast if the click didn't take effect — otherwise captures silently
  // run with the default policy and blast through all host calls.
  if (!(await radio.isChecked())) {
    throw new Error("auto-continue=never did not stick");
  }
}

/**
 * Click Run and wait until the PVM pauses on the first host call.
 *
 * Assumes `setAutoContinueNever` has been called. If the program has no host
 * calls at all, this will time out — by design.
 */
export async function runToHostCall(
  page: Page,
  timeoutMs = 20_000,
): Promise<void> {
  await page.getByTestId("run-button").click();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await page
      .getByTestId("pvm-status-typeberry")
      .textContent()
      .catch(() => null);
    if (status === "Host Call") return;
    await page.waitForTimeout(100);
  }
  throw new Error("Timed out waiting for first host-call pause");
}

/**
 * Advance from the current host-call pause to the next one.
 *
 * Returns `true` if a new pause was reached (different PC), `false` if the
 * program terminated instead.
 *
 * Uses Run (not Next) — see the header comment above.
 *
 * The leading settle-delay is a workaround for a flaky React-render cycle
 * (error #185) that can occur when Run is clicked rapidly on some trace
 * programs. Sprint-47 narrowed the common trigger but did not eliminate it
 * entirely; a proper fix is tracked separately.
 */
export async function advanceToNextHostCall(page: Page): Promise<boolean> {
  const before = await currentPc(page);
  await page.waitForTimeout(400);
  await page.getByTestId("run-button").click();
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const status = await page
      .getByTestId("pvm-status-typeberry")
      .textContent()
      .catch(() => null);
    if (status === "Host Call") {
      const now = await currentPc(page);
      if (now && now !== before) return true;
    } else if (status && status !== "Running") {
      return false;
    }
    await page.waitForTimeout(100);
  }
  return false;
}
