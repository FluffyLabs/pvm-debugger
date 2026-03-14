import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "packages",
          include: [
            "packages/*/src/**/*.test.ts",
            "apps/web/src/**/*.test.ts",
          ],
          environment: "node",
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        test: {
          name: "web",
          include: ["apps/web/src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
