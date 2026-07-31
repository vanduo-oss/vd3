# Button ring — design

## Choosing how to draw the ring

Three techniques produce the same picture. They differ in what they cost elsewhere.

### Rejected: stacked `box-shadow` (the `.vd-avatar-ring` pattern)

`css/components/avatar.css` draws its double ring with
`box-shadow: 0 0 0 3px var(--vd-avatar-border), 0 0 0 5px var(--vd-color-primary)`. The inner
layer is not a gap — it is an opaque disc painted in the surface colour, because a transparent
shadow layer just reveals the layer beneath it, which is the outer ring.

That works for avatars, which sit on a known surface. Buttons do not: vd3 buttons appear on
`--vd-bg-primary`, inside `.vd-card`, on `.vd-glass` panels, over `.vd-parallax` imagery and
inside modals. A hardcoded gap colour is wrong in most of those, and no single custom property
can track "whatever is actually behind this button". Rejected.

### Rejected: `outline` + `outline-offset`

`outline-offset` produces a genuinely transparent gap and grows the corner radius correctly, so
it renders exactly right with two declarations. The problem is that an element has one outline,
and `.vd-btn:focus-visible` already spends it:

```css
.vd-btn:focus-visible {
  outline: 2px solid var(--vd-color-primary);
  outline-offset: 2px;
}
```

Using the outline decoratively means focus must be signalled some other way — recolouring the
ring, thickening it, or falling back to a `box-shadow` glow. Every option makes the focus
indicator weaker or less distinguishable than the one every other vd3 component uses, which is
a bad trade for a decorative feature. Rejected.

### Chosen: an absolutely positioned `::before`

```css
.vd-btn-ring::before {
  content: '';
  position: absolute;
  inset: calc(-1 * var(--vd-btn-ring-offset));
  border: var(--vd-btn-ring-width) solid var(--vd-btn-ring-color);
  border-radius: var(--vd-btn-ring-radius);
  pointer-events: none;
}
```

The gap is real transparency, so the ring works on any surface, and `outline` stays free for
focus. `::before` is unused on `.vd-btn` today — `::after` is not (it carries the legacy loading
spinner at `buttons.css` and is suppressed by
`.vd-btn.is-loading:has(.vd-btn-spinner)::after { content: none; }`), which is why the ring takes
`::before` rather than `::after`.

Geometry: an absolutely positioned box with `inset: -6px` puts its border box 6px outside the
button's. The 2px border paints inward from there, so the stroke occupies −6px to −4px and the
gap runs −4px to 0. Hence `offset = gap + width`.

## Concentric corners

The ring's radius must be the button's radius plus the offset, or the corners will not be
concentric. Sizes complicate this because `.vd-btn-sm` and `.vd-btn-lg` change both the base
radius and (by design) the gap.

This resolves without JavaScript because all the declarations land on the *same element*:

```css
.vd-btn-ring {
  --vd-btn-ring-offset: calc(var(--vd-btn-ring-gap) + var(--vd-btn-ring-width));
  --vd-btn-ring-radius: calc(var(--vd-btn-border-radius) + var(--vd-btn-ring-offset));
}

.vd-btn-ring.vd-btn-sm {
  --vd-btn-ring-gap: var(--vd-btn-ring-gap-sm);
  --vd-btn-ring-radius: calc(var(--vd-btn-border-radius-sm) + var(--vd-btn-ring-offset));
}
```

A `var()` inside a custom property is substituted using the value that wins the cascade *on that
element*, so `.vd-btn-ring.vd-btn-sm` (specificity 0,2,0) overriding `--vd-btn-ring-gap` does
recompute `--vd-btn-ring-offset` even though the offset is declared on `.vd-btn-ring` (0,1,0).
Note that this only holds within one element — it would not work through inheritance to a
sibling, which is why the sibling spacing below is deliberately written to avoid needing it.

Gap sizes follow the Fibonacci scale the button padding already uses: 2px at `sm`, 4px at `md`,
6px at `lg`, with a constant 2px stroke.

## Reserving layout space

The ring paints outside the border box, so it does not push neighbours away on its own. Two
adjacent `md` ring buttons have 8px between border boxes (`.vd-btn + .vd-btn`) and rings
extending 6px each, which would overlap by 4px.

`.vd-btn-ring` therefore carries `margin: var(--vd-btn-ring-offset)` with
`margin-bottom: calc(0.5rem + var(--vd-btn-ring-offset))` to preserve the base
`.vd-btn { margin-bottom: 0.5rem; }` rhythm. That covers three of the four adjacency cases,
because a ring button's own right margin protects whatever follows it.

The exception is a ring button *preceded* by any button: `.vd-btn + .vd-btn` (0,2,0) out-ranks
`.vd-btn-ring` (0,1,0) and replaces its left margin with `0.5rem`. One rule restores it:

```css
.vd-btn + .vd-btn-ring {
  margin-left: calc(0.5rem + var(--vd-btn-ring-offset));
}
```

The subject of that selector is the ring element itself, so `--vd-btn-ring-offset` resolves. The
mirror case (`.vd-btn-ring + .vd-btn`) needs no rule.

## Colour

Default is `currentcolor`. That is correct for every transparent-fill treatment with no extra
rules — plain `.vd-btn`, all `.vd-btn-outline*`, all `.vd-btn-ghost*` — because their text colour
*is* their accent colour.

The solid variants are the exception: their text is white or black, so a `currentcolor` ring
would be an odd halo. Each overrides to its own fill colour, which is what the reference image
shows (dark fill, light text, dark ring):

```css
.vd-btn-ring.vd-btn-primary { --vd-btn-ring-color: var(--vd-color-primary); }
```

Six such rules cover primary, secondary, success, warning, danger/error and info.

## Focus, states and groups

- **Focus.** `.vd-btn-ring:focus-visible` pushes `outline-offset` to
  `calc(var(--vd-btn-ring-offset) + 2px)` so the 2px focus outline sits clear of the ring instead
  of landing inside the gap. Same colour, same width, same behaviour as every other vd3
  component — only the distance changes.
- **Disabled.** `.vd-btn:disabled` applies `opacity: 0.6` to the element, and opacity applies to
  generated content, so the ring dims with the button. No extra rule.
- **Loading.** The ring is a `::before` and the spinner is a `::after` or a real
  `.vd-btn-spinner` span, so they coexist.
- **Groups.** `.vd-btn-group > .vd-btn:not(:first-child)` sets `margin-left: -1px` to share
  edges; rings would collide with the neighbour they overlap. Both group orientations set
  `content: none` on the ring pseudo-element and zero the ring margins. The `-1px` overlap
  survives because `.vd-btn-group > .vd-btn:not(:first-child)` (0,3,0) out-ranks the
  suppression rule (0,2,0).

## Constraints honoured

Pure CSS plus one boolean prop: no `window.Vanduo*` global, no DOM scanning, no browser access
at all, so nothing to guard in `onMounted` and nothing that can break under `vite-ssg`. No new
runtime dependency. The change extends `VdButton` and `buttons.css` rather than introducing a
new component or stylesheet, so `css/vd3.css`'s import list is untouched.
