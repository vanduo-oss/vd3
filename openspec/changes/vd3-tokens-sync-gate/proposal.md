# vd3-tokens-sync-gate

## Why

The `--vd-*` custom properties ship in two independent copies with nothing
forcing them to agree:

1. **The DTCG pipeline** — `tokens/*.json` → `scripts/build-tokens.mjs` →
   `dist/tokens.json` + `src/theme/generated/tokens.data.ts` (the typed token
   data re-exported from the package root and consumed by `useTheme`).
2. **The hand-authored `css/core/tokens.css`** — the semantic `--vd-*` layer
   that is the value which actually *ships* in `dist/vd3.min.css`.

These are maintained separately, so a `--vd-*` value can drift silently between
the DTCG source and the shipped CSS — e.g. an edited spacing/font/shadow literal
in `tokens.css` that is never mirrored into `tokens/scale.tokens.json` (or vice
versa) would go unnoticed. The `vd3-token-ci-hygiene` change explicitly deferred
this sync gate as a follow-up; this change lands it.

## What Changes

Add a lightweight, dependency-free **value-sync gate** that runs in the normal
`pnpm test` suite (`tests/tokens-sync.spec.ts`). It:

- Parses the `:root` default layer of the shipped CSS — `css/core/tokens.css`
  plus the generated `colors-fib-base.css` / `colors-palette.css` partials — for
  every `--vd-<name>: <value>;` declaration.
- Resolves each `var(--vd-x)` chain down to a literal using that combined CSS
  variable map (so `--vd-color-primary: var(--vd-primary-5)` resolves the same
  way the browser would, through the Open-Color-default active layer).
- For every `--vd-*` present in **both** the CSS and the DTCG token data
  (`src/theme/generated/tokens.data.ts`, byte-identical to `dist/tokens.json`'s
  `cssVariables`), asserts the resolved literals are equal (whitespace/case
  normalized). This is the drift gate.
- Treats `--vd-*` properties that exist only in `tokens.css` (no DTCG primitive
  source — `--vd-glass-*`, `--vd-transition-*`, `--vd-z-*`, `--vd-font-family-*`,
  `--vd-border-width`, the derived `-rgb` / `-alpha-*` color helpers, and the
  extra semantic aliases/states such as `--vd-color-danger*` and the
  success/warning/error/info `-hover`/`-active` states) as intentionally
  CSS-only, but requires each to match a small documented allowlist — so a *new*
  unexplained CSS-only property still fails the gate.

**Findings from wiring the gate:** the current tree has **zero** value drift —
all 91 overlapping `--vd-*` tokens resolve to literals equal to the DTCG token
data, and the 69 CSS-only properties all fall inside the derived allowlist. No
token values were changed.

## Non-goals

- **No runtime behavior change and no token-value change.** No component logic,
  prop, emit, slot, `vd-*` class, `--vd-*` value, or `localStorage` contract
  moves. This is a dev-time test gate only.
- **No semver bump.** `package.json` stays `1.0.1`; `VD3_VERSION` is unchanged.
- **Not a completeness gate.** The gate does not require every DTCG token to
  appear in `css/core/tokens.css`, nor every CSS token to have a DTCG source; it
  only asserts *agreement on the intersection* plus an allowlist tripwire for
  CSS-only additions.
- **No structural refactor.** `tokens.css` is not regenerated from the DTCG
  source or otherwise merged with the pipeline; the two copies stay, now guarded.
- No new runtime dependencies, no new components/composables/exports, no changes
  to the old repos (`core`, `framework`, `vue`, `vd2`, satellites) or `vd3-docs`.

## Impact

- Package: `@vanduo-oss/vd3`. **Semver: none (no release).** Test-only addition;
  no shipped-artifact change. `package.json` stays `1.0.1`, `VD3_VERSION`
  unchanged.
- API compatibility (vd2 → vd3): none — no public surface changes.
- Build/test: adds one Vitest spec to the existing `pnpm test` run; no change to
  the build chain, `check:classes`, or any other gate. The spec imports the
  bootstrap-required `src/theme/generated/tokens.data.ts`, so it needs
  `pnpm build:tokens` to have run first (already true for the whole test suite).
- Docs: none (no public API or CSS change; docs-site prose is governed by
  `vd3-docs`).
- Changelog: no package-changelog entry — the gate ships no code in `dist/` and
  changes no package behavior (dev-time tooling only).
