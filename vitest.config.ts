import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.spec.ts", "src/**/*.spec.tsx"],
    exclude: ["node_modules", "dist", "build", ".git", "tests/**"],
    environment: "node",
    reporters: "default",
  },
});
