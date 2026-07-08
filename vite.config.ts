import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

// Library build for @vanduo-oss/vd3. SFCs are compiled by @vitejs/plugin-vue.
// Only `vue` stays external (the sole peer) — vd3 is fully standalone, so no
// @vanduo-oss/* package is externalized or depended on at runtime. Type
// declarations are emitted separately by `vue-tsc -p tsconfig.build.json`.
// Phase 1 (vd3-token-css-foundation) prepends token/CSS build steps.
export default defineConfig({
  plugins: [vue()],
  build: {
    // dist/ already holds the token + CSS artifacts emitted earlier in the
    // build chain; cleaning is owned by scripts/clean-dist.mjs (see
    // openspec/changes/vd3-token-css-foundation/design.md).
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      external: ["vue"],
    },
  },
});
