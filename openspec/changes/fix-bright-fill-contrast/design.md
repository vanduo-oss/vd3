# Design — bright-fill contrast

## Token contract

Three semantic foregrounds, authored in `tokens/semantic/color.tokens.json`
and `css/core/tokens.css`:

| Token | Default (`:root`, indigo) | Role |
| --- | --- | --- |
| `--vd-text-on-primary` | black | Ink on `--vd-color-primary` rest fills |
| `--vd-text-on-primary-hover` | white | Ink on `--vd-color-primary-dark` when that stop is dark enough |
| `--vd-text-on-status` | black | Ink on secondary / success / warning / error / info fills |

`--vd-text-inverse` stays the dark-surface / inverse-theme token. It MUST
NOT be reused for on-fill ink.

## Matrix (Open Color, WCAG 4.5:1)

Light rest is hue step 5; light hover is step 7. Dark rest is step 4; dark
hover is step 5. White fails 4.5:1 on almost every mid-tone rest fill,
including default indigo-5 (3.67:1). Black ink is the default.

Light hover may use white only when step 7 itself clears 4.5:1: amber,
emerald, sky, indigo, violet, purple, fuchsia, pink, rose, and black.
Red, orange, yellow, lime, green, teal, cyan, and blue keep black on hover.

Dark theme MUST NOT reset on-primary to white. Only `data-primary="black"`
in dark uses white on the darker hover stop (`#525252`). Light black-primary
uses white on rest and hover.

Consumers may override the three tokens for custom fills.

## Component wiring

Filled / hover-filled rules use the tokens. Loading spinners inherit the
same on-fill ink (`border-color` + transparent trailing edge).

Light `.vd-btn-ink:hover` stays white on `--vd-color-black`. Dark ink hover
uses `--vd-text-on-primary` on the solid primary fill.

## Tests

A Vitest contract suite computes the matrix from committed palette hexes
and asserts the CSS token overrides plus selector consumption. Negative
controls lock `.vd-badge-dark`, `.vd-table-dark`, tooltips, and
`.vd-spinner-light`.
