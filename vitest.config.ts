import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const fullyCovered = [
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
  "src/components/VdDock.vue",
  "src/components/VdDockItem.vue",
  "src/composables/useDockOrientation.ts",
];

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
      include: ["src/**/*.ts", "src/**/*.vue"],
      exclude: ["src/theme/generated/**"],
      thresholds: {
        // Measured full-source baseline; raise these as behavior coverage grows.
        lines: 91,
        branches: 79,
        functions: 95,
        statements: 89,
        "src/composables/**": {
          lines: 94,
          branches: 77,
          functions: 96,
          statements: 91,
        },
        ...Object.fromEntries(
          fullyCovered.map((file) => [
            file,
            { lines: 100, branches: 100, functions: 100, statements: 100 },
          ]),
        ),
      },
    },
  },
});
