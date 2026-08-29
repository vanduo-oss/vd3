## MODIFIED Requirements

### Requirement: theme-preference-model

The theme layer MUST carry the old vue package's preference model unchanged:
`getThemeDefaults()` / `setThemeDefaults(overrides)` (shallow merge over the
generated baseline, copy-on-read), `defaultPreference()`, `loadPreference()`
(validating stored values against the option lists), `applyPreference()`
(setting `data-palette`, `data-primary`, `data-neutral`, `data-radius`,
`--vd-radius-scale`, and removing `data-font`/`data-theme` for the
`system` values), `persistPreference()`, `defaultPrimary(theme)` (system
scheme resolved via `prefers-color-scheme`), and `isDefaultPrimary()`.
Storage SHALL default to the `vanduo-*` localStorage keys (`vanduo-palette`,
`vanduo-primary-color`, `vanduo-neutral-color`, `vanduo-radius`,
`vanduo-font-preference`, `vanduo-theme-preference`). The package MUST also
export `getStoragePrefix()` / `setStoragePrefix(prefix)` so consumers MAY
remap those six keys by replacing the `vanduo-` prefix (suffixes unchanged)
before the theme model first reads storage. Every storage or DOM access MUST
be client-guarded (SSR-safe, storage failures swallowed).

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

#### Scenario: custom storage prefix remaps keys

- **GIVEN** `setStoragePrefix("ts-school-")` before any theme read
- **WHEN** `persistPreference()` writes a preference
- **THEN** values land under `ts-school-palette` (and the other five
  `ts-school-*` keys), not under `vanduo-*`

### Requirement: vanduo-vue-plugin

The package MUST export a Vue plugin named `VanduoVue` whose `install`
applies `options.storagePrefix` (when provided) via `setStoragePrefix` and
`options.themeDefaults` via `setThemeDefaults` synchronously — storage
prefix first — and does nothing else. The old `loadVanduoRuntime` export and
all IIFE-loading machinery MUST NOT exist; installing the plugin SHALL NOT
touch `window.Vanduo*` or import `@vanduo-oss/framework`.

#### Scenario: install applies theme defaults

- **GIVEN** `app.use(VanduoVue, { themeDefaults: { PRIMARY_DARK: "blue" } })`
- **WHEN** `getThemeDefaults()` is read immediately after
- **THEN** `PRIMARY_DARK` is `blue`

#### Scenario: install applies storage prefix

- **GIVEN** `app.use(VanduoVue, { storagePrefix: "labs-" })`
- **WHEN** `getStoragePrefix()` is read immediately after
- **THEN** the prefix is `labs-`

#### Scenario: no runtime loader

- **GIVEN** the built package
- **WHEN** its exports and emitted bundle are inspected
- **THEN** `loadVanduoRuntime` is absent and no dynamic import of any
  framework runtime exists
