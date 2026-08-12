## Why

Multi-app same-origin consumers (Labs, TypeScript School, Home) collide on the
hardcoded `vanduo-*` theme localStorage keys. Apps currently monkey-patch
`localStorage` or remap keys on first load. An optional storage prefix lets
each consumer choose an isolated namespace without breaking existing installs.

## What Changes

- Derive the six theme preference keys from a configurable prefix (default
  `vanduo-`).
- Expose `setStoragePrefix` / `getStoragePrefix` and wire
  `app.use(VanduoVue, { storagePrefix })` so the prefix is set before the
  theme model first reads storage.
- Update theme-runtime openspec: default keys remain `vanduo-*`; override is
  allowed when set at bootstrap.
- Document in README / SKILL; bump CHANGELOG to 1.2.3.

## Capabilities

### New Capabilities

- _None._

### Modified Capabilities

- `theme-runtime`: storage keys default to `vanduo-*` but MAY be remapped via
  `storagePrefix` / `setStoragePrefix` before first theme read; `VanduoVue`
  MAY apply `options.storagePrefix` on install.

## Semver

**Patch additive API on 1.2.3.** Default behavior unchanged. New optional
plugin option and helpers only.

## Non-goals

- No automatic migration between old and new key namespaces.
- No Labs/school remapper removal in this change.
- No change to the `data-*` attribute contract.

## Impact

- `src/composables/useTheme.ts`, `src/plugin.ts`
- `openspec/specs/theme-runtime/spec.md`
- Tests under `tests/composables/` and `tests/plugin.spec.ts`
- `README.md`, `SKILL.md`, `CHANGELOG.md`, `package.json`
