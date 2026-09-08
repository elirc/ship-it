import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "typescript",
      "prettier/standalone",
      "prettier/plugins/babel",
      "prettier/plugins/typescript",
      "prettier/plugins/estree",
    ],
  },
  worker: { format: "es" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes("/node_modules/monaco-editor/")) return "monaco";
        },
      },
    },
  },
});
