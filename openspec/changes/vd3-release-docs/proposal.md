# vd3-release-docs

## Why

The code surface of `@vanduo-oss/vd3` is now complete: the token/CSS
foundation, the pure-Vue carryover, the delegating-composable rewrites, the
seven new components/five new composables, and the four hardening fixes have
all landed and archived. The two consumer-facing docs shipped in the tarball —
`SKILL.md` and `README.md` — have not kept pace, so they are the last blocker
to a release-ready package.

Both files still describe the repo as a half-built scaffold rather than the
shipped surface:

1. **`SKILL.md` describes work that no longer exists as "upcoming."** Its
   frontmatter `description` says "Not yet published to npm (pre-release
   scaffold)"; the body says "Phase 0 scaffold only" and points at
   `vd3-token-css-foundation` / `vd3-carryover` as "upcoming changes" whose
   "full API documentation lands in this file before the first release." That
   API never landed in the file — an agent loading this skill gets no install
   command, no component/composable inventory, no theme surface, and no import
   for the CSS. For an Agent Skill that is the whole point of the file.
2. **`README.md` install/status is inaccurate.** It has no install/usage
   section at all (only Exports, Build pipeline, Development), and its status
   line still says the "delegating-composable rewrites (`vd3-rewrites`) land
   next" — a change that is already archived (`2026-07-11-vd3-rewrites`).
   A reader cannot learn how to install the package, import the stylesheet,
   register the plugin, or discover what is exported.
3. **Neither file states the real, release-relevant posture** a consumer needs:
   the actual install (`pnpm add @vanduo-oss/vd3`, `import "@vanduo-oss/vd3/css"`,
   `app.use(VanduoVue)`), the true inventory (52 exported components + ~35
   composables including the theme layer and the `useThemePreference`
   singleton), tokens/theming (`data-*` attributes, `--vd-*` custom properties,
   `vanduo-*` storage keys, the `./css` / `./css/core` / `./tokens.json`
   exports), the SSR / vite-ssg safety guarantee, or the security posture
   (zero runtime deps beyond the `vue` peer, hardened `.npmrc`, MIT +
   `THIRD-PARTY-LICENSES`).

This change updates only those two documentation artifacts so the package's
own docs accurately describe the shipped API for the first release. It is a
docs-only pass: no `package.json`, no exports map, no source, no CSS, no
tokens, no tests change.

## What Changes

Documentation only. Content is written to match the surface that already
exists in `src/index.ts`, `src/plugin.ts`, `src/composables/useTheme.ts`, the
exports map in `package.json`, and the archived `theme-runtime` /
`css-distribution` / `components` / `composables` specs — nothing is invented,
and no shipped behavior is altered.

- **`SKILL.md`** — keep the Agent-Skills YAML frontmatter (`name` / `description`
  keys); refresh `description` to describe the shipped, installable package
  (drop the "pre-release scaffold / not yet published" framing that will be
  false at release). Replace the "Phase 0 scaffold only / upcoming changes"
  body with the real agent reference:
  - Install: `pnpm add @vanduo-oss/vd3`; import the stylesheet with
    `import "@vanduo-oss/vd3/css"`; register the plugin with
    `app.use(VanduoVue)` (optionally `app.use(VanduoVue, { themeDefaults })`).
  - Inventory: the 52 exported components (45 `Vd*` components + 7 layout
    primitives `VdBox` / `VdCenter` / `VdCover` / `VdFrame` / `VdInline` /
    `VdStack` / `VdSwitcher`) and the ~35 composables, called out by group
    (form, overlay, motion/scroll, theme). Name the theme layer
    (`useTheme` surface: `getThemeDefaults` / `setThemeDefaults`,
    `loadPreference` / `applyPreference` / `persistPreference`,
    `defaultPreference` / `defaultPrimary`) and the `useThemePreference`
    module-scope reactive singleton (no pinia).
  - Theming/tokens: the `data-palette` / `-primary` / `-neutral` / `-radius` /
    `-theme` / `-font` attribute contract, `--vd-*` custom properties, the
    `vanduo-*` localStorage keys, and the `./css` / `./css/core` /
    `./tokens.json` subpath exports.
  - SSR: all browser access is client-guarded (`onMounted` / `onScopeDispose`),
    so the package is SSR-safe under `vite-ssg`; `useThemePreference`
    initializes lazily on the first client call.
- **`README.md`** — add an **Install** and a **Usage** section (the three real
  steps above with a minimal `main.ts`-style snippet); add a short
  **Components & composables** overview (the same real inventory, summarized)
  and a **Theming** subsection (attribute/custom-property/storage contract +
  the CSS exports); add an **SSR** note (vite-ssg-safe) and a **Security**
  note (zero runtime deps beyond the `vue >=3.3` peer, no pinia, hardened
  `.npmrc` posture — `ignore-scripts` / `minimum-release-age` /
  `save-exact` / `strict-peer-dependencies`, MIT license, bundled
  third-party licenses). Correct the stale status line (the rewrites are
  archived, not "next"); keep the existing accurate Exports / Build pipeline /
  Development sections.

The `THIRD-PARTY-LICENSES` file (Open Color, Phosphor Icons, expanding-cards)
and the hardened `.npmrc` are the factual basis for the security note; both
already exist and are unchanged.

## Non-goals

- **No code, config, or asset changes.** `package.json` (name, version `0.1.0`,
  `files`, exports map, scripts, deps), `src/**`, `css/**`, `tokens/**`,
  `scripts/**`, tests, `.npmrc`, `THIRD-PARTY-LICENSES`, `LICENSE`, and CI are
  all untouched. This change edits `SKILL.md` and `README.md` and nothing else.
- **No version bump and no publish.** The package stays at `0.1.0`; making the
  docs release-ready does not itself release or publish anything. If a
  "pre-release" honesty note is kept, it must not contradict the real install
  instructions.
- **No new exports, components, composables, CSS classes, tokens, or
  behavior.** The docs describe only what `src/index.ts` and the exports map
  already ship. Nothing that is not exported is documented as available.
- **No CHANGELOG package-behavior entry.** Per the changelog policy the file
  tracks package behavior only; a docs-only pass adds no consumer-visible
  behavior, so no `Unreleased` behavior bullet is required (a docs note is
  optional and non-normative).
- **No docs-site (vd3-docs) work.** This is the in-repo package documentation
  only; the standalone docs site lives in its own repo and its own change.
- **No `window.Vanduo*` / IIFE / auto-init guidance.** The vd3 pure-Vue rules
  stand; the docs describe the plugin + composable surface only, never a
  vanilla runtime.
- **No changes to the old repos** (core, framework, vue, vd2, satellites) —
  they remain strictly read-only reference.

## Capabilities

### Modified Capabilities

- `repo-scaffold`: adds a `release-ready-documentation` requirement pinning the
  `README.md` install/usage/inventory/theming/SSR/security content against the
  real shipped surface, and an `agent-skill-reference` requirement pinning
  `SKILL.md`'s Agent-Skills frontmatter plus the same install + inventory +
  theming + SSR reference for LLM/agent consumers. No existing
  `repo-scaffold` requirement (package-metadata, hardened-install-policy,
  standalone-library-build, quality-gates, continuous-integration) is altered.

## Impact

- Package: `@vanduo-oss/vd3`. Docs-only; the tarball `files` list already
  includes `README.md` and `SKILL.md`, so the shipped content improves with no
  manifest change. **Semver: no runtime impact** — patch-equivalent
  documentation change on the unpublished `0.1.0` pre-release line; nothing a
  consumer imports or renders changes.
- API compatibility (vd2 → vd3 migration, old `@vanduo-oss/vue@0.3.0` →
  `@vanduo-oss/vd3`): unchanged. The docs newly *state* the migration-relevant
  facts a vd2 consumer needs — one standalone install replaces the old
  three-package split (core tokens + framework CSS/JS + vue components), pinia
  is gone (`useThemePreference` is the de-pinia'd theme store, `useToast`
  is a module-scope singleton), the plugin is `VanduoVue` (no
  `loadVanduoRuntime` / IIFE), and the `data-*` / `--vd-*` / `vanduo-*`
  contracts carry over verbatim — but they introduce no new or changed API.
- Build/test: the `pnpm build` chain, `check:classes`, and the vitest suite are
  unaffected (no components, CSS, or exports change). Gates re-run only as the
  usual pre-commit hygiene (lint / format:check / typecheck / test stay green;
  markdown edits do not touch them beyond prettier's file globs, which exclude
  `*.md`).
- Docs: this *is* the in-repo docs update; the separate vd3-docs site is
  out of scope and unaffected.
- Changelog: no package-behavior entry required (docs-only, per policy).
