# Graduate snippet chrome — Tasks

- [x] 1. Extend `VdCodeSnippet` with chrome mode + optional `highlight` hook
      (simple figure contract unchanged; tab props win; one copy button).
- [x] 2. Map `.vd-tk-*` onto `--vd-code-*` inside `.vd-code-snippet`; leave
      `.code-*` as a legacy hand-span contract.
- [x] 3. Extend `tests/components/vd-code-snippet.spec.ts`: simple-mode
      regression, chrome tabs/collapse/copy/ARIA, highlight hook, raw copy,
      XSS interpolation.
- [x] 4. SKILL.md honesty: `VdCodeSnippet` does not highlight unless the
      caller passes `highlight`. CHANGELOG / version `1.6.0`.
- [x] 5. `pnpm test`, `pnpm typecheck`, `pnpm lint` (and stylelint on the
      CSS edit). `pnpm build` includes `check:classes` when CSS is ready.
- [x] 6. Docs sync in vd3-docs (separate change): thin `DocCodeSnippet`
      wrapper injecting cbun `highlight`.
- [x] 7. Do not push, open a PR, or publish until the human reviews.
