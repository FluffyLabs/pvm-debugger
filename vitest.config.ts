import { defineConfig, Plugin } from "vitest/config";
import path from "path";

// Plugin to polyfill import.meta.resolve for Vitest
const importMetaResolvePlugin = (): Plugin => ({
  name: "import-meta-resolve-polyfill",
  transform(code, id) {
    // Only apply to @typeberry/lib
    if (id.includes("@typeberry/lib")) {
      // Replace import.meta.resolve with a polyfill that returns a fake absolute URL
      // This is sufficient for tests where we don't actually load the worker
      return code.replace(
        /import\.meta\.resolve\s*\(\s*["']([^"']+)["']\s*\)/g,
        (_match, specifier) => `"file:///fake-path/${specifier}"`,
      );
    }
  },
});

export default defineConfig({
  plugins: [importMetaResolvePlugin()],
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
