import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function manifestPlugin(): Plugin {
  return {
    name: "emit-extension-manifest",
    async generateBundle() {
      const manifestPath = fileURLToPath(new URL("./manifest.json", import.meta.url));
      const source = await readFile(manifestPath, "utf-8");

      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), manifestPlugin()],
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
    "process.env": {}
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "es2020",
    lib: {
      entry: fileURLToPath(new URL("./src/content/index.tsx", import.meta.url)),
      name: "ChatGPTCompanionContent",
      formats: ["iife"],
      fileName: () => "assets/content.js"
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
