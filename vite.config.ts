import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "path";
import packageJson from "./package.json";
import { importMetaResolveEsbuildPlugin, importMetaResolvePolyfill } from "./plugins/import-meta-resolve";

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ["@typeberry/lib"],
    esbuildOptions: {
      plugins: [importMetaResolveEsbuildPlugin()],
    },
  },
  build: {
    rollupOptions: {
      external: ["module"],
      treeshake: {
        moduleSideEffects: false,
        preset: "smallest",
      },
    },
  },
  plugins: [importMetaResolvePolyfill(), react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.TYPEBERRY_PVM_VERSION": JSON.stringify(packageJson.dependencies["@typeberry/lib"]),
  },
});
