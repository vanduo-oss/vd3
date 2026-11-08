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

function vitestExecArgv(): string[] {
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  // The flag arrived in Node 22.4. Node 20 rejects it and would fail every worker.
  if (major > 22 || (major === 22 && minor >= 4)) {
    return ["--no-experimental-webstorage"];
  }
  return [];
}

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    // Node 26 exposes an experimental localStorage that stays undefined unless
    // --localstorage-file is set, and that getter blocks jsdom's storage.
    execArgv: vitestExecArgv(),
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
