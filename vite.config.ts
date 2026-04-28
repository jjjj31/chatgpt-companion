import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

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
  plugins: [manifestPlugin()],
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "es2020",
    lib: {
      entry: fileURLToPath(new URL("./src/content/index.ts", import.meta.url)),
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
