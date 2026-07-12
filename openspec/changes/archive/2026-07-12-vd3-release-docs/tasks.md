# Tasks

Docs-only pass over the two in-tarball documentation artifacts. Every fact is
sourced from the already-shipped surface — `src/index.ts` (exports),
`src/plugin.ts` (`VanduoVue`), `src/composables/useTheme.ts` (theme layer +
`useThemePreference`), `package.json` (exports map, `vue` peer, `0.1.0`),
`.npmrc` (security posture), and `THIRD-PARTY-LICENSES` — so nothing is
invented and no code changes. No `package.json`, `src/**`, `css/**`,
`tokens/**`, or test edits.

## 1. SKILL.md — release-ready agent reference

- [x] 1.1 Keep the Agent-Skills YAML frontmatter with `name` and `description`
      keys. Update `description` to describe the shipped, installable package
      (drop "Not yet published to npm (pre-release scaffold)"), keeping it a
      single "Use when …" line under the Agent-Skills length norm.
- [x] 1.2 Replace the "Phase 0 scaffold only / upcoming changes" body with an
      **Install** section: `pnpm add @vanduo-oss/vd3`; import the stylesheet
      with `import "@vanduo-oss/vd3/css"`; register the plugin with
      `app.use(VanduoVue)` (and the `{ themeDefaults }` option form). Verify the
      import specifier against the `package.json` exports map before writing.
- [x] 1.3 Add an **Inventory** section: the 52 exported components — 45 `Vd*`
      components plus the 7 layout primitives (`VdBox`, `VdCenter`, `VdCover`,
      `VdFrame`, `VdInline`, `VdStack`, `VdSwitcher`) — grouped for scanability,
      and the ~35 composables grouped (form, overlay, motion/scroll, theme).
      Cross-check the exact names and count against `src/index.ts`.
- [x] 1.4 Add a **Theme** section: the `useTheme` surface (`getThemeDefaults` /
      `setThemeDefaults`, `loadPreference` / `applyPreference` /
      `persistPreference`, `defaultPreference` / `defaultPrimary`) and the
      `useThemePreference` module-scope reactive singleton (no pinia); the
      `data-palette` / `-primary` / `-neutral` / `-radius` / `-theme` / `-font`
      attribute contract, `--vd-*` custom properties, `vanduo-*` localStorage
      keys, and the `./css` / `./css/core` / `./tokens.json` subpath exports.
- [x] 1.5 Add an **SSR** note: browser access is client-guarded
      (`onMounted` / `onScopeDispose`), SSR-safe under `vite-ssg`;
      `useThemePreference` initializes lazily on the first client call.

## 2. README.md — install/usage/theming/SSR/security

- [x] 2.1 Correct the stale status line: the delegating-composable rewrites
      (`vd3-rewrites`) are archived, not "next"; state the accurate current
      status without contradicting the install instructions.
- [x] 2.2 Add an **Install** section (`pnpm add @vanduo-oss/vd3`) and a
      **Usage** section with a minimal snippet showing all three steps —
      `import "@vanduo-oss/vd3/css"`, `app.use(VanduoVue)`, and a component in
      a template. Keep the existing accurate Exports / Build pipeline /
      Development sections intact.
- [x] 2.3 Add a **Components & composables** overview: the 52-component /
      ~35-composable inventory summarized (with the primitives named), matching
      the SKILL.md inventory and `src/index.ts`.
- [x] 2.4 Add a **Theming** subsection: the `data-*` attribute contract,
      `--vd-*` custom properties, `vanduo-*` storage keys, the theme
      composables/plugin `themeDefaults` override, and the CSS/token exports.
- [x] 2.5 Add an **SSR** note (vite-ssg-safe, client-guarded browser access).
- [x] 2.6 Add a **Security** note: zero runtime dependencies beyond the
      `vue >=3.3` peer (no pinia); the hardened `.npmrc` posture
      (`ignore-scripts`, `minimum-release-age`, `save-exact`,
      `strict-peer-dependencies`, explicit registry); MIT license; bundled
      `THIRD-PARTY-LICENSES` (Open Color, Phosphor Icons, expanding-cards).
      Source every claim from the committed `.npmrc` / `THIRD-PARTY-LICENSES` /
      `package.json`; do not overstate.

## 3. Consistency, gates, and validation

- [x] 3.1 Cross-check SKILL.md and README.md against each other and against
      `src/index.ts` + `package.json` exports: component count (52), composable
      grouping, plugin name (`VanduoVue`), import specifiers, and export
      subpaths must agree exactly and describe only what is actually exported.
- [x] 3.2 `mise exec node@24 -- pnpm format:check` and `pnpm lint` stay green
      (markdown edits do not regress the source gates; no `src/**` touched).
      No `pnpm build` / `pnpm test` needed — no code, CSS, or tokens change,
      so `check:classes` and the vitest suite are unaffected.
- [x] 3.3 `openspec validate vd3-release-docs --strict` green.
