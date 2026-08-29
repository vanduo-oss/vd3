# Button ink variant — design

## Why not reuse `outline` or `ring`

`.vd-btn-outline` already owns “transparent + 1px primary + fill primary on
hover”. Changing that hover to black-in-light / primary-in-dark would
recolour every outline button in the system.

`.vd-btn-ring` is a **modifier**: a second stroke outside the border box
with a transparent gap. The home secondary CTA is the opposite shape — one
fat stroke on the border box, no halo.

A new variant keeps both contracts byte-identical.

## Resting and hover

```css
.vd-btn-ink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: transparent;
  border-color: var(--vd-color-primary);
  border-style: solid;
  border-width: 2px;
  color: var(--vd-color-primary);
}
```

`inline-flex` + `align-items: center` keeps the label optically centered
when the control also hosts an SR-only child. `2px` is a physical stroke
(same weight as `--vd-btn-ring-width`), not a rem, so it does not collapse
under a short root font.

Light hover fills `--vd-color-black` (ink). Dark hover
(`[data-theme="dark"]` and `prefers-color-scheme` when `data-theme` is
unset) fills `--vd-color-primary`. Both hovers set the label to
`--vd-text-on-primary` so contrast does not depend on `--vd-text-inverse`
flipping to gray-900 in dark.

## Visually-hidden children

`.vd-btn > * + * { margin-left: 0.5rem }` and `display: inline-block` let a
clipped “(opens in a new tab)” span wrap onto a second line (~57px) while
the visible label sits on the first. `.vd-btn .vd-visually-hidden` is
absolutely positioned with the sibling margin reset so the hint stays in
the accessibility tree without affecting the box.

## Composition

Ink is a variant, not a modifier. `.vd-btn-ink.vd-btn-ring` is allowed —
the ring keeps `currentcolor` like other transparent-fill treatments.
Sizes (`sm` / `lg`) and `.is-loading` use the existing size and spinner
hooks; the legacy `::after` spinner pins primary like outline.
