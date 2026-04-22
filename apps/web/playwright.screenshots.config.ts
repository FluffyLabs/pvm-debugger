import { defineConfig } from "@playwright/test";

/**
 * Dedicated Playwright config for regenerating the usage-guide screenshots.
 *
 * Run with: npm run screenshots
 *
 * Specs live in ./screenshots and drive the UI into specific states before
 * calling page.screenshot(). Output is written to docs/usage-screenshots/.
 */
export default defineConfig({
  testDir: "./screenshots",
  testMatch: /.*\.screenshot\.ts$/,
  timeout: 60_000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4199",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  },
  webServer: {
    command: "npx vite preview --port 4199",
    port: 4199,
    reuseExistingServer: !process.env.CI,
  },
});
