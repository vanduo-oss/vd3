# Code snippet chrome — design

## Two modes, one component

The CSS already describes two widgets. The SFC only implemented the simple
one. Absorbing the docs chrome as a **second mode** closes that split
without breaking existing `code` consumers.

| Mode | Trigger | Root | Body |
|---|---|---|---|
| Simple | `code` only (no tab props) | `figure.vd-code-snippet` | `pre.vd-code-snippet-pre > code` |
| Chrome | any of `html` / `css` / `js` / `shell` / `vue` / `json` | `div.vd-code-snippet` | toggle + tablist + panes |

Tab props win. Do not nest simple copy on top of chrome copy.

## Highlight is injected, not bundled

vd3 stays vue-only. A function hook scales across tabs; a single
pre-highlighted HTML string does not (`htmlHighlighted`, `jsHighlighted`,
…). The hook MUST return escaped HTML — vd3 will not sanitize it. Default
path stays `{{ code }}` so XSS cannot land without the caller opting in.

`language` passed to the hook is the **tab key** (`html`, `js`, `vue`, …)
in chrome mode, or the `language` prop in simple mode. Mapping that key to
a tokenizer id is the caller’s job (docs `highlight.ts` + cbun).

## Token colors without cbun CSS

Cbun emits `vd-tk-*`. Snippet chrome already has `--vd-code-*`. Map the
cbun classes **inside** `.vd-code-snippet` so a docs (or app) highlight
function can inject cbun HTML and the snippet theme is complete. Editor
pages keep `--vd-code-editor-tk-*`. Do not start emitting unused `.code-*`.

## ARIA (parity with docs `DocCodeSnippet`)

- `data-collapsible` present only when `collapsible` is true (default in
  chrome). CSS uses attribute presence, so `data-collapsible="false"`
  would still match — omit the attribute instead.
- Toggle: `aria-expanded`. Tabs: `role="tablist"` / `role="tab"` /
  `aria-selected`.
- Active pane `tabindex="0"` when expanded so axe
  `scrollable-region-focusable` passes (`overflow-x: auto` on panes).
  Inactive / collapsed panes stay `tabindex="-1"`.

## Constraints honoured

Pure Vue, no new runtime deps, no `window.Vanduo*`. Clipboard stays
client-guarded. Class coverage must resolve every static `vd-*` class
chrome mode renders (all already exist in `code-snippet.css`).
