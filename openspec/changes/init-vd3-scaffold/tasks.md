# Tasks

## 1. Package metadata + install policy

- [ ] 1.1 Create `package.json`: name `@vanduo-oss/vd3`, version `0.1.0`,
      MIT, `type: "module"`, `sideEffects: ["**/*.css"]`, dist entry points
      (`main`/`module`/`types`), exports map (`.`, `./css`, `./css/core`,
      `./tokens.json`, `./package.json`), `files` (dist + docs), peer
      `vue >=3.3.0` only (no pinia), repository/homepage/bugs →
      github.com/vanduo-oss/vd3, keywords,
      `packageManager: "pnpm@10.28.2"`, engines node `>=24` / pnpm `>=10`.
- [ ] 1.2 devDependencies: copy exact specs from `vue/package.json`
      (@eslint/js, @typescript-eslint/parser, @vitejs/plugin-vue,
      @vue/tsconfig, eslint, eslint-plugin-vue, prettier, typescript,
      typescript-eslint, vite, vue, vue-eslint-parser, vue-tsc — no pinia);
      add vitest + @vitest/coverage-v8 (^4 line per vd2), @vue/test-utils +
      jsdom (vd2 specs), lightningcss (framework spec), stylelint +
      stylelint-config-standard (vd2 specs).
- [ ] 1.3 Scripts: `build` (`vite build && vue-tsc -p tsconfig.build.json`),
      `typecheck`, `lint`, `format`, `format:check`, `stylelint`
      (`--allow-empty-input`), `test` (`vitest run`).
- [ ] 1.4 Create `.npmrc` from `vue/.npmrc` verbatim (header comment renamed
      to @vanduo-oss/vd3), keeping all hardening lines and
      `minimum-release-age-exclude[]=@vanduo-oss/*`.
- [ ] 1.5 Create `pnpm-workspace.yaml` (charts shape) with
      `onlyBuiltDependencies: [esbuild]`.

## 2. TypeScript + build tooling

- [ ] 2.1 Create `tsconfig.json` (vue repo base: strict,
      `moduleResolution: "bundler"`, `resolveJsonModule`), include
      `src/**/*.ts`, `src/**/*.vue`, `tests/**/*.ts`.
- [ ] 2.2 Create `tsconfig.build.json` (declaration-only emit to `dist/`,
      rootDir `src`, include `src` only).
- [ ] 2.3 Create `vite.config.ts` — lib mode, entry `src/index.ts`, formats
      es + cjs, `sourcemap: true`, external **only** `vue`.
- [ ] 2.4 Create `vitest.config.ts` — `environment: "jsdom"`, include
      `tests/**/*.spec.ts`.

## 3. Lint + style configs

- [ ] 3.1 Create `eslint.config.js` from the vue repo flat config (incl.
      the `innerHTML` no-restricted-syntax guard), extending ignores with
      `dist/**`, `css/core/generated/**`, `openspec/**`, `.claude/**`.
- [ ] 3.2 Create `stylelint.config.js` from `vd2/stylelint.config.js`.
- [ ] 3.3 Create `.gitignore`: node_modules/, dist/, css/core/generated/,
      *.tsbuildinfo, .DS_Store, coverage/, playwright artifacts.

## 4. CI + repo docs

- [ ] 4.1 Create `.github/workflows/ci.yml` adapted from the vue repo:
      SHA-pinned actions, `permissions: contents: read`, paths-ignore for
      `**/*.md`, pnpm 10.28.2, node 24, `pnpm install --frozen-lockfile`,
      then lint, format:check, stylelint, typecheck, test, build.
- [ ] 4.2 Create `.github/dependabot.yml` (copy from vue repo).
- [ ] 4.3 Copy `LICENSE` (MIT) from the vue repo.
- [ ] 4.4 Create stub `README.md` (what vd3 is, pre-release status, planned
      exports table, dev commands).
- [ ] 4.5 Create stub `SKILL.md` (frontmatter `name: vanduo-vd3` +
      description; body notes full API docs land before release).
- [ ] 4.6 Create `CHANGELOG.md` with `## Unreleased` scaffold entry.

## 5. Stub source + smoke test

- [ ] 5.1 Create `src/index.ts` exporting `VD3_VERSION = "0.1.0"` with a doc
      comment pointing at the `vd3-carryover` and
      `vd3-token-css-foundation` follow-up changes.
- [ ] 5.2 Create `tests/smoke.spec.ts` asserting `VD3_VERSION` equals
      `package.json`'s version (JSON import via `resolveJsonModule`).

## 6. Verification

- [ ] 6.1 `pnpm install` succeeds (lockfile generated and committed).
- [ ] 6.2 `pnpm lint` passes with zero errors.
- [ ] 6.3 `pnpm format:check` passes (after one `pnpm format` normalize).
- [ ] 6.4 `pnpm stylelint` passes (`--allow-empty-input`, no css/ yet).
- [ ] 6.5 `pnpm typecheck` (`vue-tsc --noEmit`) passes.
- [ ] 6.6 `pnpm test` runs the smoke spec green.
- [ ] 6.7 `pnpm build` emits `dist/index.js`, `dist/index.cjs`,
      `dist/index.d.ts` (+ sourcemaps).
- [ ] 6.8 `openspec validate init-vd3-scaffold` passes.
