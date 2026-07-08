# Design notes — vd3-token-css-foundation

## Build-chain ordering (and why vite must not clobber dist/)

`dist/` receives artifacts from three different producers:

| Producer               | Artifacts                                                        |
| ---------------------- | ---------------------------------------------------------------- |
| `scripts/build-tokens.mjs` | `dist/tokens.js`, `dist/tokens.d.ts`, `dist/tokens.json` (+ `css/core/generated/*.css`) |
| `scripts/build-css.mjs`    | `dist/vd3*.css(.map)`, `dist/fonts/`, `dist/icons/`          |
| `vite build` + `vue-tsc`   | `dist/index.{js,cjs}(.map)`, `dist/index.d.ts` + declarations |

Vite's default `build.emptyOutDir: true` wipes `dist/` at the start of
`vite build`, which would destroy everything the two node scripts emitted
before it. Two orderings avoid that: run the scripts *after* vite, or disable
`emptyOutDir` and clean explicitly *before* the chain. We picked the second:

```
clean-dist → build-tokens → build-css → vite build (emptyOutDir: false) → vue-tsc
```

Rationale:

- **Tokens must precede CSS anyway**: `css/vd3.css` imports
  `core/generated/colors-fib-base.css` / `colors-palette.css`, which
  `build-tokens.mjs` generates. Emitting CSS after vite would still need
  tokens first, splitting the CSS pipeline across the vite boundary for no
  benefit.
- **Explicit clean beats implicit clean**: a tiny `scripts/clean-dist.mjs`
  (`rm -rf dist`) at the head of the chain makes "a build starts from
  nothing" a visible, ordered step instead of a vite side effect buried
  mid-chain. `vite.config.ts` sets `build.emptyOutDir: false` with a comment
  pointing here.
- **Partial rebuilds stay safe-ish**: `pnpm build:tokens` / `pnpm build:css`
  can be run standalone to refresh just their outputs without nuking the
  vite bundles (only the full `pnpm build` cleans).

## Generated partials live in `css/core/generated/` (gitignored)

The old pipeline committed `colors-fib-base.css` / `colors-palette.css` into
`framework/css/core/` and regenerated them cross-repo from core. In vd3 they
are pure build output, so they move under `css/core/generated/` — already in
`.gitignore` and excluded from stylelint (the scaffold anticipated this).
Filenames are kept so import churn is limited to the entry's two paths, and
the emitted rule bodies are kept byte-identical to the old framework partials
(banner comment aside) so the bundled CSS stays parity-comparable with
`framework/dist/vanduo.min.css`.

## CSS build: what is mirrored from framework, what is dropped

Mirrored (names adapted `vanduo*` → `vd3*`): dev + production CSS variants
(`vd3.css`, `vd3.min.css`, `vd3-core.css`, `vd3-core.min.css`) with source
maps; the core variant strips the icon-entry `@import` exactly like the
framework's `vanduo-core`; fonts and the referenced Phosphor weights
(regular + fill, per `css/icons/icons.css`) are copied beside the bundles so
the rewritten `url('./fonts/…')` / `url('./icons/…')` references resolve
from `dist/`.

Dropped: the JS bundles (vite owns JS in vd3), `build-info.json` and the
timestamp/git-commit banner — vd3's banner is
`/*! @vanduo-oss/vd3 v<version> | <mode> */` so CSS builds are deterministic
(byte-identical across runs), matching the token generator's determinism
contract.

## Stylelint scope

The authored `css/**` tree is linted with the scaffold config extended by
the framework's rule relaxations (the tree is carried unmodified, so the
linter adapts to the code rather than the reverse — keeping the carried CSS
diffable against its source). `css/core/generated/**` stays excluded: it is
build output with its own guarantees (generator determinism + rule-parity
tests), and linting it would just re-lint the generator.

## Vitest: `fileParallelism: false`

The ported build-contract specs shell out to `node scripts/build-tokens.mjs`
and assert determinism by rebuilding and re-reading shared paths
(`dist/tokens.*`, `css/core/generated/*`). Parallel spec files would race on
those files, so the vitest config disables file parallelism (the suite is
small; the cost is negligible).
