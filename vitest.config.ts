import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.spec.ts"],
    // The build-contract specs shell out to scripts/build-tokens.mjs and
    // assert determinism on shared paths (dist/tokens.*, css/core/generated/*);
    // parallel spec files would race on those writes.
    fileParallelism: false,
  },
});
