# Design notes — vd3-carryover

## Context

vd3 owns the token pipeline (`scripts/build-tokens.mjs`) and the CSS tree; the
old `@vanduo-oss/vue` src is the read-only donor for the Vue surface. Three
donor dependencies must be severed during the carry: `@vanduo-oss/core`
(token data — now generated in-repo), `@vanduo-oss/framework/iife`
(`window.Vanduo*` runtime — banned in vd3), and `pinia` (peer already dropped
from vd3's manifest). Everything else copies verbatim: the point of this
change is fidelity, so diffs against the donor stay reviewable.

## Goals / Non-Goals

**Goals:**

- Carry the pure-Vue surface 1:1; retarget only the three severed
  dependencies.
- Make the token *data* a build-time input to the lib bundle with no runtime
  file reads and no second copy of the data shipped.
- Lock the useToast public API by a type test before the store rewrite so the
  rewrite cannot drift.
- Bootstrap the test culture the donor never had (mount spec per component,
  jsdom spec per composable).

**Non-Goals:**

- Rewriting the 12 delegating/DOM-scan composables or `VdMenu`
  (`vd3-rewrites`).
- Any behavior, markup, or CSS change beyond the documented retargets.

## Decisions

### 1. Token-data import strategy: generated `src/theme/generated/tokens.data.ts`

`scripts/build-tokens.mjs` gains one emit: `src/theme/generated/tokens.data.ts`
— a self-contained, deterministic TypeScript module carrying exactly the
surface the old `@vanduo-oss/core` exported (`ColorDef` / `FontDef` /
`PaletteDef` / `ThemeDefaults` interfaces, `RadiusOption` / `ThemeMode` /
`Palette` unions, `PALETTE_OPTIONS`, `PRIMARY_COLORS`, `NEUTRAL_COLORS`,
`RADIUS_OPTIONS`, `FONT_OPTIONS`, `THEME_MODES`, `DEFAULTS`, `tokens`). It is
the same data the generator already computes for `dist/tokens.js`; only the
serialization target changes (TS source with `as const`-style readonly
typing instead of JS + hand-emitted `.d.ts`).

`src/composables/useTheme.ts` imports from `../theme/generated/tokens.data`
and re-exports the data + types (as it did with core), so the package root is
the single import surface. Vite inlines the module into `dist/index.js` /
`dist/index.cjs` at build time — no runtime read, no extra dist file — and
`vue-tsc` emits its declarations like any other `src/` module.

Alternatives rejected:

- **Import `../../dist/tokens.js` from src** — imports build output from
  source: fragile TS resolution on clean checkouts, couples vite's graph to a
  sibling emit, and double-ships the data (inlined AND as dist file).
- **Import `dist/tokens.json`** — loses the literal type unions
  (`RadiusOption`, `Palette`), needs `resolveJsonModule`, and the customizer
  arrays would still need typing by hand next to the data.
- **Hand-written `tokens.data.ts` committed in git** — drifts from
  `tokens/*.tokens.json`; the whole point of the generator is one source of
  truth.

The file is build output inside `src/`: gitignored
(`src/theme/generated/`), excluded from ESLint and Prettier globs (generated
code is formatted by its generator, byte-deterministically), and included in
`tsconfig` like normal source so typecheck covers real usage.

### 2. Fate of `dist/tokens.js` / `dist/tokens.d.ts`: dropped

With the data inlined into the root bundle and re-exported from `.`, keeping
`dist/tokens.js` would ship the same data twice with no exports-map entry
pointing at it (deep `dist/` imports are unsupported). Decision: the
generator stops emitting `dist/tokens.js` + `dist/tokens.d.ts`.

- `./tokens.json` **stays exported** — it is the language-neutral artifact
  (Figma/tooling) and has consumers the JS module never had.
- Old `@vanduo-oss/core` JS consumers migrate to
  `import { DEFAULTS, tokens } from "@vanduo-oss/vd3"` — same names, better
  tree-shaking position.
- `tests/build-tokens.spec.ts` retargets its module-surface assertions from
  `dist/tokens.js` to `src/theme/generated/tokens.data.ts` (and the root
  export via the built types); the determinism/artifact-set scenarios drop
  the two dist files and add the generated TS module.
- Spec impact: `design-tokens` `token-build-generator` + `token-data-module`
  requirements are modified accordingly (delta in this change).

### 3. useToast: module-scope `reactive()` singleton, type-locked first

Order of operations is load-bearing:

1. **Lock**: `tests/useToast-api.spec.ts` lands first, pinning the public
   surface with `expectTypeOf`/`assertType` — exported names (`useToast`,
   `useToastStore`, `ToastType`, `ToastPosition`, `ToastEntry`,
   `ToastOptions`), the flexible `show()` overload behavior
   (`show('msg')`, `show('msg','success',3000)`, `show('msg',{…})`,
   `show({message,…})` → `string` id), `dismiss(id)`, the four typed helpers,
   and a reactive `queue` of `ToastEntry`. The spec is written against the
   *intended* vd3 module so it fails until the rewrite lands, then locks it.
2. **Rewrite**: state moves from `defineStore("toast", …)` to module scope —
   `const queue = reactive<ToastEntry[]>([])` (or `ref` + returned `.value`
   semantics matching donor usage: `store.queue.filter(…)` — pinia unwraps
   the ref, so the singleton must expose a plain reactive array property to
   keep `VdToastContainer` and the type lock byte-compatible).
   `useToastStore()` returns one stable frozen singleton object;
   `useToast()` keeps returning the same seven members. Defaults stay
   mirrored from `framework/js/components/toast.js` (`duration: 5000`,
   `position: "top-right"`, `dismissible: true`, `showProgress: true`,
   `solid: false`).

Trade-off, accepted and documented: module-scope state is process-global. In
SSR every request would share the queue (the pinia version was per-app).
Toasts are client-only interactions (the container teleports to `body`), so
under vite-ssg/SSG this is inert at render time; the SSR caveat goes in the
composable's doc comment.

### 4. Plugin: keep `VanduoVue`, delete the runtime loader

`plugin.ts` keeps the exported `VanduoVue` name and `VanduoVueOptions`
(`themeDefaults`, applied synchronously via `setThemeDefaults` on install) so
`app.use(VanduoVue, {…})` code ports 1:1. `loadVanduoRuntime`, the
`runtimePromise` machinery, and `src/shims.d.ts` are deleted — vd3 has no
IIFE. The `ThemeDefaults` type now comes from the theme layer. This is the
one intentionally breaking export removal; the barrel simply never lists it.

### 5. File layout mirrors the donor

`src/components/` (+ `primitives/`), `src/composables/`, `src/utils/`,
`src/types.ts`, `src/plugin.ts`, `src/index.ts` keep the donor layout so
future diffs against the read-only reference stay trivial. The only new
directory is `src/theme/generated/`. `useTheme`/`useThemeBridge` stay in
`src/composables/` (donor position); only the import line changes.

### 6. Gate bootstrap ordering

`src/` no longer typechecks on a virgin clone until `tokens.data.ts` exists,
so: CI inserts `pnpm run build:tokens` immediately after install (before
lint/typecheck/test); README documents the same one-liner for local dev. The
`build` chain already starts with `build-tokens`, and gains
`check:classes` after `vue-tsc` (per project build-order contract), plus an
explicit CI `check:classes` step after build for visible gate reporting —
double execution is sub-second. `check-class-coverage.mjs` carries with two
edits: default CSS path `dist/vanduo-vue.css` → `dist/vd3.min.css`, and the
failure hint pointing at vd3's own `css/` tree instead of
"@vanduo-oss/framework".

### 7. Test bootstrap shape

- Component mount specs live under `tests/components/` — one file per
  component (primitives may share one file), each asserting at minimum:
  root `vd-*` class rendering, a representative prop→class mapping, declared
  emits fire, and `v-model` round-trip where the component models a value.
- Composable specs live under `tests/composables/` — jsdom behavior specs
  (mount a harness component, drive DOM/events, assert effects and cleanup
  on unmount).
- `vitest` keeps `fileParallelism: false` (the build-contract specs still
  shell out to the token generator); the suite stays well under a minute.

## Risks / Trade-offs

- [Generated TS inside `src/` confuses tooling] → gitignore + ESLint/Prettier
  excludes are added in the same task as the emit; the generator output is
  deterministic and prettier-shaped, and `pnpm build:tokens` is the first CI
  step so no gate ever sees the file missing.
- [useToast singleton shared across SSR requests] → accepted; client-only
  feature, caveat documented (Decision 3).
- [API drift during the toast rewrite] → the type-lock spec lands before the
  rewrite and CI runs it.
- [Silent markup drift while copying 44 SFCs] → mount specs assert rendered
  classes, and `check:classes` proves every rendered `vd-*` class exists in
  `dist/vd3.min.css` — the same gate that caught the 0.2.0 modal drift in the
  old line.
- [Deferred `VdMenu` breaks barrel parity] → explicit Non-goal + migration
  note; `vd3-rewrites` restores it.

## Migration Plan

Additive pre-release change to an unpublished 0.1.0 package — no deploy or
rollback machinery. Old-line consumers migrate per the proposal's
vd2 → vd3 notes when vd3 first publishes.

## Open Questions

- None blocking. (Whether `vd3-rewrites` also restores a `dist/tokens.js`
  deep import for non-bundler consumers was considered and answered: no —
  `./tokens.json` plus the root export cover the known consumers.)
