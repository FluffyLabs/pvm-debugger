import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.spec.ts", "src/**/*.spec.tsx"],
    exclude: ["node_modules", "dist", "build", ".git", "tests/**"],
    environment: "jsdom",
    reporters: "default",
    setupFiles: ["src/test-setup.ts"],
    globals: true,
  },
});
