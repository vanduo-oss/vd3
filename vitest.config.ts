import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.spec.ts"],
    // The build-contract specs shell out to scripts/build-tokens.mjs and
    // assert determinism on shared paths (dist/tokens.json, generated
    // partials, src/theme/generated/*); parallel spec files would race on
    // those writes.
    fileParallelism: false,
    // Type-level API locks (e.g. the useToast public-API lock, written
    // before its pinia-free rewrite) run through vue-tsc as part of
    // `pnpm test`.
    typecheck: {
      enabled: true,
      checker: "vue-tsc",
      include: ["tests/types/**/*.test-d.ts"],
      tsconfig: "./tsconfig.json",
    },
    coverage: {
      provider: "v8",
      include: [
        "src/components/VdInput.vue",
        "src/components/VdCard.vue",
        "src/components/VdCheckbox.vue",
        "src/components/VdOtpInput.vue",
        "src/components/VdAuthCard.vue",
        "src/components/VdLogin.vue",
        "src/components/VdSignUp.vue",
        "src/components/VdForgotPassword.vue",
        "src/components/VdEmptyState.vue",
        "src/components/VdDataTable.vue",
        "src/composables/useTableState.ts",
      ],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
