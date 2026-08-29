## 1. Spec + API

- [x] 1.1 OpenSpec delta for theme-runtime (default `vanduo-*`, optional prefix)
- [x] 1.2 `setStoragePrefix` / `getStoragePrefix` + derived storage keys in `useTheme.ts`
- [x] 1.3 `storagePrefix` on `VanduoVueOptions`; apply on install before themeDefaults

## 2. Tests + docs

- [x] 2.1 Unit tests: default keys unchanged; custom prefix read/write; plugin wiring
- [x] 2.2 README + SKILL document `storagePrefix`
- [x] 2.3 CHANGELOG 1.2.3 + bump `package.json` version

## 3. Verify

- [x] 3.1 `openspec validate theme-storage-prefix --strict`
- [x] 3.2 Full QA gates: lint, format:check, stylelint, typecheck, test, build, check:classes
