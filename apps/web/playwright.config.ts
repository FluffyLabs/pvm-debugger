import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:4199",
  },
  webServer: {
    command: "npx vite preview --port 4199",
    port: 4199,
    reuseExistingServer: !process.env.CI,
  },
});
