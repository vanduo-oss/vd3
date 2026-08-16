# Graduate snippet chrome into `VdCodeSnippet`

## Why

vd3 already ships the CSS for collapsible, tabbed “View Code” blocks
(`css/components/code-snippet.css`). `VdCodeSnippet` never rendered that
chrome — it is a single `figure > pre > code` with a copy button. The docs
site therefore forks the widget (`DocCodeSnippet`) and highlights with
`highlight.js`. Apps that want the same chrome have nothing to import, and
vd3 cannot depend on cbun or highlight.js without breaking the vue-only
contract.

## What Changes

- `VdCodeSnippet` gains an additive **chrome mode** when any of `html` /
  `css` / `js` / `shell` / `vue` / `json` is set: same markup/ARIA as the
  docs widget (toggle, tablist, panes, raw-source copy).
- Simple mode (`code` / `language` / `copyable`) stays the current figure
  contract. Tab props win when both are passed.
- Optional `highlight?: (code, language) => string` hook. Absent: text
  interpolation (XSS-safe). Present: `v-html` of the return value. The
  function MUST return escaped HTML. Copy always uses raw source.
  `language` is the tab key, not a cbun id. No `highlightedHtml` string prop.
- Inside `.vd-code-snippet`, map cbun `.vd-tk-*` spans onto existing
  `--vd-code-*` tokens so snippets theme without importing cbun CSS.
  Unused `.code-*` stays a legacy hand-span contract (not emitted).

## Capabilities

### New Capabilities

- _None._ Chrome is a second mode of the existing component.

### Modified Capabilities

- `components`: `VdCodeSnippet` chrome mode + optional highlight hook.

## Semver

**Minor — additive.** `1.5.0 → 1.6.0`. Existing `code` / `language` /
`copyable` renderings are unchanged.

## Migration note (`@vanduo-oss/vue` → vd3)

None. Simple-mode markup matches the carried figure contract. Chrome mode
is vd3-only surface.

## Non-goals

- Importing `@vanduo-oss/vd3-cbun` or `highlight.js`.
- A second tokenizer in vd3, or emitting `.code-*` spans.
- A parallel `highlightedHtml` / per-tab highlighted string prop.
- Nesting two copy buttons.
- Docs-site wrapper swap (vd3-docs, separate change).
- Git push, PR, or npm publish in this change.
