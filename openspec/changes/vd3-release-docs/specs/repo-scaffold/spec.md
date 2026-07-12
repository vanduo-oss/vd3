## ADDED Requirements

### Requirement: release-ready-documentation

The repo MUST ship a `README.md` that documents the actually-exported surface
of `@vanduo-oss/vd3` for a consuming developer, accurate against `package.json`
and `src/index.ts`. It SHALL contain an install step (`pnpm add @vanduo-oss/vd3`),
a usage step showing the three real integration points — importing the
stylesheet with `import "@vanduo-oss/vd3/css"`, registering the plugin with
`app.use(VanduoVue)` (optionally `app.use(VanduoVue, { themeDefaults })`), and
rendering a `Vd*` component — and an overview of the shipped inventory (the 52
exported components: 45 `Vd*` components plus the 7 layout primitives `VdBox`,
`VdCenter`, `VdCover`, `VdFrame`, `VdInline`, `VdStack`, `VdSwitcher`; and the
~35 composables including the theme layer and the `useThemePreference`
singleton). It MUST document the theming contract (the `data-palette` /
`-primary` / `-neutral` / `-radius` / `-theme` / `-font` attributes, `--vd-*`
custom properties, `vanduo-*` localStorage keys, and the `./css` / `./css/core`
/ `./tokens.json` subpath exports), an SSR note stating the package is
`vite-ssg`-safe because all browser access is client-guarded, and a security
note stating zero runtime dependencies beyond the `vue >=3.3` peer (no pinia),
the hardened `.npmrc` posture, MIT licensing, and the bundled
`THIRD-PARTY-LICENSES`. Every documented name, count, import specifier, and
export subpath MUST match what the package actually exports; no unexported or
non-existent API may be documented as available.

#### Scenario: install and usage are accurate and complete

- **GIVEN** the release-ready `README.md`
- **WHEN** a developer reads the install/usage sections
- **THEN** they find `pnpm add @vanduo-oss/vd3`, `import "@vanduo-oss/vd3/css"`,
  and `app.use(VanduoVue)`, and each import specifier resolves against the
  `package.json` exports map (`.`, `./css`, `./css/core`, `./tokens.json`)

#### Scenario: documented inventory matches the exports

- **GIVEN** the README component/composable overview and `src/index.ts`
- **WHEN** the documented names and counts are compared against the exports
- **THEN** the 52 components (45 `Vd*` + 7 layout primitives) and the theme
  layer / `useThemePreference` are all real exports, and no documented symbol
  is absent from `src/index.ts`

#### Scenario: theming, SSR, and security posture are stated

- **GIVEN** the release-ready `README.md`
- **WHEN** its theming, SSR, and security sections are read
- **THEN** the `data-*` / `--vd-*` / `vanduo-*` contract and the CSS/token
  exports are documented, the SSR note states `vite-ssg` safety via
  client-guarded browser access, and the security note states the `vue >=3.3`
  sole peer (no pinia), the hardened `.npmrc` posture, MIT license, and the
  bundled third-party licenses — each traceable to `package.json`, `.npmrc`,
  or `THIRD-PARTY-LICENSES`

#### Scenario: status line is not stale

- **GIVEN** the README status/intro text
- **WHEN** it is checked against the archived changes
- **THEN** it does not describe already-archived work (e.g. `vd3-rewrites`) as
  upcoming, and any pre-release note does not contradict the install steps

### Requirement: agent-skill-reference

The repo MUST ship a `SKILL.md` in Agent-Skills format — a YAML frontmatter
block with a `name` key and a single-line `description` key ("Use when …"),
followed by the reference body — that gives an LLM/agent enough to build a UI
with the package without reading source. The `description` MUST describe the
shipped, installable package (it MUST NOT frame the package as an unbuilt
"pre-release scaffold" whose API is still "upcoming"). The body SHALL document
the same real install (`pnpm add @vanduo-oss/vd3`, `import "@vanduo-oss/vd3/css"`,
`app.use(VanduoVue)`), the component/composable inventory grouped for
scanability (the 52 components incl. the 7 named layout primitives, and the
~35 composables incl. the `useTheme` surface and the `useThemePreference`
singleton), the theming contract (`data-*` attributes, `--vd-*` custom
properties, `vanduo-*` storage keys, and the `./css` / `./css/core` /
`./tokens.json` exports), and the SSR posture (client-guarded browser access,
`vite-ssg`-safe, `useThemePreference` lazy client init). It MUST NOT reference
`window.Vanduo*` globals, IIFE loading, or a `loadVanduoRuntime` runtime — the
package is pure Vue.

#### Scenario: frontmatter is valid Agent-Skills format

- **GIVEN** the release-ready `SKILL.md`
- **WHEN** its leading YAML frontmatter is parsed
- **THEN** it has a `name` key and a single-line `description` key, and the
  `description` describes the installable package rather than an unbuilt
  scaffold with an upcoming API

#### Scenario: body carries an actionable install + inventory

- **GIVEN** the `SKILL.md` body
- **WHEN** an agent reads it
- **THEN** it finds the `pnpm add` install, the `@vanduo-oss/vd3/css` import,
  the `app.use(VanduoVue)` registration, the grouped component/composable
  inventory (matching `src/index.ts`), the theming contract, and the SSR note
  — with no reference to `window.Vanduo*`, IIFE loading, or `loadVanduoRuntime`
