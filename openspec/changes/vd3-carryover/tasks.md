# Tasks

## 1. Token-data module (unblocks everything that imports theme data)

- [x] 1.1 Extend `scripts/build-tokens.mjs`: emit
      `src/theme/generated/tokens.data.ts` (deterministic, self-contained TS
      module with the exact old `@vanduo-oss/core` surface — `ColorDef` /
      `FontDef` / `PaletteDef` / `ThemeDefaults` interfaces, `RadiusOption` /
      `ThemeMode` / `Palette` unions, `PALETTE_OPTIONS`, `PRIMARY_COLORS`,
      `NEUTRAL_COLORS`, `RADIUS_OPTIONS`, `FONT_OPTIONS`, `THEME_MODES`,
      `DEFAULTS`, `tokens`); create `src/theme/generated/` if missing.
- [x] 1.2 Stop emitting `dist/tokens.js` + `dist/tokens.d.ts`
      (`dist/tokens.json` stays; `./tokens.json` export untouched).
- [x] 1.3 Add `src/theme/generated/` to `.gitignore` and to the ESLint /
      Prettier ignore globs; keep it inside the `tsconfig` include so
      typecheck covers real usage.
- [x] 1.4 Retarget `tests/build-tokens.spec.ts`: determinism + artifact-set +
      export-surface scenarios move from `dist/tokens.js` to
      `src/theme/generated/tokens.data.ts`; assert the two legacy dist files
      are no longer emitted.

## 2. Theme layer + plugin

- [x] 2.1 Carry `useTheme.ts` (donor 204 lines) with only the import line
      retargeted from `@vanduo-oss/core` to `../theme/generated/tokens.data`;
      keep the re-export of the data + type surface so the package root is
      the single JS import point.
- [x] 2.2 Carry `useThemeBridge.ts` (donor 23 lines) unmodified.
- [x] 2.3 Rewrite `src/plugin.ts`: keep `VanduoVue` + `VanduoVueOptions`
      (`themeDefaults` applied synchronously via `setThemeDefaults`); delete
      `loadVanduoRuntime`, the `runtimePromise` machinery, and the
      `ThemeDefaults` import from core (now from the theme layer); do NOT
      carry `src/shims.d.ts`.
- [ ] 2.4 Theme/plugin specs: `tests/composables/useTheme.spec.ts`
      (defaults merge, load/apply/persist, `vanduo-*` keys, invalid-value
      fallback, system-value attribute removal, `defaultPrimary` /
      `isDefaultPrimary`), `tests/composables/useThemeBridge.spec.ts`
      (ref-driven `data-theme` re-application), `tests/plugin.spec.ts`
      (install applies `themeDefaults`; `loadVanduoRuntime` absent).

## 3. useToast — lock first, then rewrite

- [x] 3.1 (landed as `tests/types/toast-api.test-d.ts`, run via vitest
      typecheck) Write the type lock BEFORE the implementation:
      `expectTypeOf`/`assertType` pins on the exported names (`useToast`,
      `useToastStore`, `ToastType`, `ToastPosition`, `ToastEntry`,
      `ToastOptions`), the flexible `show()` signature (all four call shapes
      → `string` id), `dismiss(id)`, the four typed helpers, and the
      reactive `queue` member set `{ queue, show, dismiss, success, error,
      warning, info }`.
- [x] 3.2 Rewrite `src/composables/useToast.ts` (donor 123 lines) as a
      module-scope `reactive()` singleton — no pinia import, identical
      public API, defaults mirroring `framework/js/components/toast.js`
      (`duration: 5000`, `position: "top-right"`, `dismissible: true`,
      `showProgress: true`, `solid: false`); document the SSR
      shared-singleton caveat in the doc comment.
- [ ] 3.3 Behavior spec `tests/composables/useToast.spec.ts`: singleton
      shared across callers, flexible `show()` runtime behavior, defaults,
      `dismiss` filtering; verify the pre-written type lock passes
      unmodified.

## 4. Pure composables (18)

- [x] 4.1 Copy the 17 remaining pure composables verbatim into
      `src/composables/`: `useAffix`, `useDatepicker`, `useFocusTrap`,
      `useGlass`, `useKeyboardNav`, `useMorph`, `useMorphBadges`,
      `useNavbarGlassScroll`, `useParallax`, `useScrollspy`, `useSidenav`,
      `useStepper`, `useSuggest`, `useTimepicker`, `useTooltips`,
      `useWaypoint` (+ `useTheme` / `useThemeBridge` from task 2).
- [x] 4.2 Guard: grep `src/` for `window.Vanduo`, `@vanduo-oss/framework`,
      and `pinia` — zero matches (the 12 delegating/DOM-scan composables
      stay out; they land in `vd3-rewrites`).
- [ ] 4.3 jsdom behavior spec per carried composable under
      `tests/composables/` (harness mount, drive DOM/events, assert effects
      + cleanup on unmount).

## 5. Components (37 SFCs + 7 primitives)

- [x] 5.1 Copy the 37 carried SFCs from `vue/src/components/` verbatim
      (everything except `VdMenu.vue`, deferred to `vd3-rewrites`), plus
      `form-types.ts`.
- [x] 5.2 Copy the 7 layout primitives from
      `vue/src/components/primitives/`.
- [x] 5.3 Carry `src/utils/sanitizeHtml.ts` (donor 129 lines) and
      `src/types.ts` (`StatusVariant`) verbatim.
- [x] 5.4 Rebuild `src/index.ts` mirroring the donor barrel minus `VdMenu`,
      `loadVanduoRuntime`, and the 12 excluded composables; keep
      `VD3_VERSION`, the `StatusVariant` + `TreeNode` type re-exports, and
      the `sanitizeHtml` export.
- [ ] 5.5 Mount spec per exported SFC under `tests/components/` (primitives
      may share one file): root `vd-*` class, representative prop→class
      mapping, declared emits, `v-model` round-trip where applicable;
      toast-stack specs cover position grouping + dismissal via the
      singleton queue.

## 6. Class-coverage gate

- [x] 6.1 Carry `vue/scripts/check-class-coverage.mjs` (136 lines) to
      `scripts/check-class-coverage.mjs`; repoint the default stylesheet at
      `dist/vd3.min.css` and the remediation message at this repo's `css/`
      tree.
- [x] 6.2 Add the `check:classes` script and append it to the `build`
      chain after `vue-tsc`.

## 7. Wiring + CI

- [x] 7.1 `.github/workflows/ci.yml`: insert `pnpm run build:tokens`
      immediately after install (bootstraps `tokens.data.ts` for
      lint/typecheck/test on a fresh clone) and `pnpm run check:classes`
      after build.
- [x] 7.2 README: document the `pnpm build:tokens` bootstrap one-liner for
      fresh clones.
- [x] 7.3 CHANGELOG: one unreleased `@vanduo-oss/vd3` entry (packages only,
      per policy) covering the carried surface, the toast/plugin breaking
      notes, and the `dist/tokens.js` drop.

## 8. Verification

- [x] 8.1 `pnpm build` green (clean → build-tokens → build-css → vite →
      vue-tsc → check:classes), run via `mise exec node@24 -- pnpm build`.
- [x] 8.2 `pnpm test` green (65 spec files / 668 tests: components,
      composables, theme, plugin, API lock, build contracts), via
      `mise exec node@24 --`. Type Errors: none.
- [x] 8.3 `pnpm lint`, `pnpm format:check`, `pnpm stylelint`,
      `pnpm typecheck` green; confirm `git status` shows
      `src/theme/generated/` untracked-invisible.
- [x] 8.4 Fresh-clone rehearsal: remove `dist/`, `css/core/generated/`,
      `src/theme/generated/` → `pnpm build:tokens` → all gates pass.
- [ ] 8.5 Flag the new public surface for vd3-docs (docs sync happens in the
      docs repo's own change; no docs-site work here).
- [ ] 8.6 `openspec validate vd3-carryover --strict` green; then archive per
      workflow.
