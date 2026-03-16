import { defineConfig } from "vitest/config";
import path from "node:path";

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
        resolve: {
          alias: {
            "@fixtures": path.resolve(__dirname, "fixtures"),
          },
        },
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
