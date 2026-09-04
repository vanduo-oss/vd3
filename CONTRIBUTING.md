# Contributing to vd3

## Setup

Requires **Node 24** (CI) and **pnpm 10**. Consumers of the compiled package
only need **Node >= 20.19**.

```sh
pnpm install && pnpm build:tokens
```

`src/theme/generated/tokens.data.ts` is gitignored build output. Lint,
typecheck, and test need that bootstrap.

## Gates

```sh
pnpm lint
pnpm format:check
pnpm stylelint
pnpm typecheck
pnpm test
pnpm build
```

Do not edit `css/core/generated/` or `src/theme/generated/` by hand.

## OpenSpec

Active changes live in `openspec/changes/`. Archive with
`openspec archive <id> --yes` so deltas merge into `openspec/specs/`.
`openspec/` is not published.

## Release

Bump `package.json` and `VD3_VERSION` together. `pnpm release` builds then
publishes; do not publish from a docs-only or incomplete branch.
