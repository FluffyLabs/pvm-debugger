import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "path";
import packageJson from "./package.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: ["decd-85-221-148-245.ngrok-free.app"],
  },
  define: {
    "import.meta.env.TYPEBERRY_PVM_VERSION": JSON.stringify(
      packageJson.dependencies["@typeberry/pvm-debugger-adapter"],
    ),
  },
});
