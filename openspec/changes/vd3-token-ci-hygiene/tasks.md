# Tasks

Comment/doc/config/CI hygiene plus one dev-only security override. No source
logic changes; the build and existing gates stay green.

## 1. Palette comments

- [x] 1.1 In `css/core/colors.css` and `css/vd3.css`, correct the palette
      comments (Open Color is the default; Fibonacci opts in via
      `data-palette="fibonacci"`) and replace `@vanduo-oss/core` with
      `scripts/build-tokens.mjs`.

## 2. tokens.json description + stale header

- [x] 2.1 In `scripts/build-tokens.mjs`, soften the `dist/tokens.json`
      `$description` so it does not claim to be the complete `--vd-*` set
      (non-color props ship from `css/core/tokens.css`). Full sync-gate is a
      follow-up (out of scope).
- [x] 2.2 In `css/core/tokens.css`, drop the stale `v1.4.1` header comment.

## 3. Font count

- [x] 3.1 In `openspec/config.yaml`, change `Fonts (10 families)` to
      `Fonts (11 families)` (11 families ship).

## 4. VdThemeCustomizer dead classes

- [x] 4.1 In `src/components/VdThemeCustomizer.vue`, remove the dead
      `btn btn-sm btn-outline` classes from the Reset button, leaving
      `class="customizer-reset"`.

## 5. emptyOutDir invariant

- [x] 5.1 In `vite.config.ts`, document (next to `emptyOutDir: false`) that no
      SFC may carry a `<style>` block, and why (plugin-vue would emit an
      unreferenced style asset that accumulates in `dist/`).

## 6. README trims

- [x] 6.1 Trim the duplicated full per-group inventory to a counts-level
      overview (SKILL.md owns the full list); keep the 52 components (45 `Vd*` +
      the 7 named layout primitives), ~35 composables, the theme layer /
      `useThemePreference`, and `sanitizeHtml`.
- [x] 6.2 Reduce the Status section to a single `Status: 1.0.0 — first public
      release` line (drop the internal `vd3-rewrites`/`vd3-new-components`/
      `vd3-hardening` slugs).

## 7. .npmrc prose

- [x] 7.1 Reword the scope-exclude comment to "all @vanduo-oss first-party
      publishes" (the functional `minimum-release-age-exclude[]` line stays).

## 8. CI hardening

- [x] 8.1 In `.github/workflows/ci.yml`, add `cache: pnpm` to `setup-node` and a
      `pnpm audit --audit-level=moderate` step after
      `pnpm install --frozen-lockfile`. (The three action pins already match the
      siblings' SHAs — checkout v7.0.0, pnpm/action-setup v6.0.9, setup-node
      v7.0.0 — so no bump was needed.)
- [x] 8.2 In `pnpm-workspace.yaml`, add security `overrides` pinning
      `brace-expansion@>=2.0.0 <2.1.2` → `^5.0.7` (GHSA-3jxr-9vmj-r5cp) and
      `fast-uri@>=3.0.0 <=3.1.3` → `^3.1.4` (GHSA-v2hh-gcrm-f6hx). Run
      `pnpm install`; confirm the vulnerable versions are gone from the lockfile
      and `pnpm audit --audit-level=moderate` reports no known vulnerabilities.

## 9. Gates and validation

- [x] 9.1 `mise exec node@24 -- pnpm build` green (tokens/CSS rebuilt with the
      new comments/description; `check:classes` green).
- [x] 9.2 `pnpm lint`, `pnpm format:check`, `pnpm stylelint`, `pnpm typecheck`,
      `pnpm test` green.
- [x] 9.3 CHANGELOG: unreleased `@vanduo-oss/vd3` "Changed" entries for the
      shipped edits (packages only).
- [x] 9.4 `openspec validate vd3-token-ci-hygiene --strict` green.
