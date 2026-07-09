## ADDED Requirements

### Requirement: theme-data-from-generated-module

`src/composables/useTheme.ts` MUST source its token data from the generated
`src/theme/generated/tokens.data.ts` (no `@vanduo-oss/core` import anywhere
in the repo) and SHALL re-export that surface so the package root exposes
`PALETTE_OPTIONS`, `PRIMARY_COLORS`, `NEUTRAL_COLORS`, `RADIUS_OPTIONS`,
`FONT_OPTIONS`, `THEME_MODES`, and the `ColorDef` / `FontDef` / `PaletteDef`
/ `ThemeDefaults` / `RadiusOption` / `ThemeMode` / `Palette` types with the
old `@vanduo-oss/core` names. The data MUST be inlined into the built lib
bundle — `dist/index.js` SHALL NOT import any module other than `vue`.

#### Scenario: root exposes the token-data surface

- **GIVEN** the built package
- **WHEN** the root module is imported
- **THEN** the six option arrays are non-empty, `PALETTE_OPTIONS` includes
  `open-color` and `fibonacci`, and the type names resolve

#### Scenario: data is inlined, not imported

- **GIVEN** the emitted `dist/index.js`
- **WHEN** its bare module specifiers are inspected
- **THEN** `vue` is the only one

### Requirement: theme-preference-model

The theme layer MUST carry the old vue package's preference model unchanged:
`getThemeDefaults()` / `setThemeDefaults(overrides)` (shallow merge over the
generated baseline, copy-on-read), `defaultPreference()`, `loadPreference()`
(validating stored values against the option lists), `applyPreference()`
(setting `data-palette`, `data-primary`, `data-neutral`, `data-radius`,
`--vd-radius-scale`, and removing `data-font`/`data-theme` for the
`system` values), `persistPreference()`, `defaultPrimary(theme)` (system
scheme resolved via `prefers-color-scheme`), and `isDefaultPrimary()`.
Storage SHALL keep the `vanduo-*` localStorage keys (`vanduo-palette`,
`vanduo-primary-color`, `vanduo-neutral-color`, `vanduo-radius`,
`vanduo-font-preference`, `vanduo-theme-preference`) and every storage or
DOM access MUST be client-guarded (SSR-safe, storage failures swallowed).

#### Scenario: apply sets the attribute contract

- **GIVEN** a preference of palette `fibonacci`, theme `dark`, radius `0.25`
- **WHEN** `applyPreference()` runs in jsdom
- **THEN** `<html>` carries `data-palette="fibonacci"`,
  `data-theme="dark"`, `data-radius="0.25"`, and
  `--vd-radius-scale: 0.25`

#### Scenario: system values remove attributes

- **GIVEN** a preference with `theme: "system"` and `font: "system"`
- **WHEN** `applyPreference()` runs
- **THEN** `data-theme` and `data-font` are absent from `<html>`

#### Scenario: invalid stored values fall back to defaults

- **GIVEN** localStorage containing an unknown palette under
  `vanduo-palette`
- **WHEN** `loadPreference()` runs
- **THEN** the returned palette is the default, not the stored garbage

#### Scenario: overrides shallow-merge

- **GIVEN** `setThemeDefaults({ PRIMARY_DARK: "blue" })`
- **WHEN** `getThemeDefaults()` is read
- **THEN** `PRIMARY_DARK` is `blue` and all other keys keep the generated
  baseline values

### Requirement: theme-bridge

`useThemeBridge(mode)` MUST carry unchanged: given an app-owned
`Ref<ThemeMode>`, it SHALL re-apply the full preference (including
re-derived default primary) on mount and on every ref change, driving the
same `data-theme` contract.

#### Scenario: bridge follows the app ref

- **GIVEN** a mounted harness bridging a ref initialized to `light`
- **WHEN** the ref changes to `dark`
- **THEN** `<html>` gains `data-theme="dark"` and the default primary is
  re-derived for the dark scheme

### Requirement: vanduo-vue-plugin

The package MUST export a Vue plugin named `VanduoVue` whose `install`
applies `options.themeDefaults` synchronously via `setThemeDefaults` — and
does nothing else. The old `loadVanduoRuntime` export and all IIFE-loading
machinery MUST NOT exist; installing the plugin SHALL NOT touch
`window.Vanduo*` or import `@vanduo-oss/framework`.

#### Scenario: install applies theme defaults

- **GIVEN** `app.use(VanduoVue, { themeDefaults: { PRIMARY_DARK: "blue" } })`
- **WHEN** `getThemeDefaults()` is read immediately after
- **THEN** `PRIMARY_DARK` is `blue`

#### Scenario: no runtime loader

- **GIVEN** the built package
- **WHEN** its exports and emitted bundle are inspected
- **THEN** `loadVanduoRuntime` is absent and no dynamic import of any
  framework runtime exists
