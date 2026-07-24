# Tasks

Add a dependency-free token value-sync gate to the test suite. No source logic,
no token values, and no public API change; all existing gates stay green.

## 1. Sync-gate test

- [x] 1.1 Add `tests/tokens-sync.spec.ts`. Parse the `:root` default layer of
      `css/core/tokens.css` and the generated `colors-fib-base.css` /
      `colors-palette.css` partials into one CSS variable map, and resolve each
      `var(--vd-x)` chain to a literal (dependency-free regex parsing).
- [x] 1.2 Import the DTCG token data from `src/theme/generated/tokens.data.ts`
      (byte-identical to `dist/tokens.json` `cssVariables`) as the source of
      resolved DTCG literals.
- [x] 1.3 For every `--vd-*` present in both sources, assert the resolved CSS
      literal equals the DTCG literal (whitespace/case normalized) — the drift
      gate. Include a guard asserting a meaningful overlap exists (so the gate
      cannot go silently green if parsing breaks) and that every overlapping
      token resolves to a literal (no dangling `var()`).

## 2. CSS-only allowlist

- [x] 2.1 Collect the `--vd-*` present in `tokens.css` but absent from the DTCG
      data and assert each matches a small, commented allowlist derived from the
      current file: effect/utility families (`--vd-glass-*`, `--vd-transition-*`,
      `--vd-z-*`, `--vd-font-family-*`, `--vd-border-width`), derived color
      helpers (`--vd-color-*-rgb`, `--vd-color-*-alpha-*`), and semantic
      aliases/states (`--vd-color-danger*`, `--vd-color-accent-(light|dark)`,
      success/warning/error/info `-hover`/`-active`, extra text roles). A CSS-only
      token matching none of these fails the gate on purpose.

## 3. Reconcile any real drift

- [x] 3.1 Run the gate and inspect results. Outcome: **zero drift** — all 91
      overlapping tokens agree and all 69 CSS-only tokens are within the
      allowlist, so no token value on either side needed reconciling.

## 4. Gates and validation

- [x] 4.1 `mise exec node@24 -- pnpm test` green (new spec included).
- [x] 4.2 `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm stylelint`,
      `pnpm run check:classes`, `pnpm build` green.
- [x] 4.3 Confirm no version bump: `package.json` stays `1.0.1`, `VD3_VERSION`
      unchanged (dev-time gate only, no changelog entry).
- [x] 4.4 `openspec validate vd3-tokens-sync-gate --strict` green.
