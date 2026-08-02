## Context

See proposal.md — Why. Loading today:

```css
.vd-btn.is-loading {
  color: transparent; /* hide label */
}
.vd-btn.is-loading::after {
  border: 2px solid currentColor; /* spinner */
  border-right-color: transparent;
}
.vd-btn-primary.is-loading::after /* …solids… */ {
  border-color: var(--vd-color-white);
  border-right-color: transparent;
}
```

Solid variants override because their text colour is white/black and must not
drive the spinner via `currentColor` after blanking. Outline/ghost never got
the parallel override, so `currentColor` stays transparent.

`::before` is taken by `.vd-btn-ring`; the spinner stays on `::after` (or the
real `.vd-btn-spinner` span when `VdButton` sets `loading`).

## Goals / Non-Goals

**Goals:**

- Make the loading spinner visible on every transparent-fill treatment and on
  the plain base button, for both the legacy `::after` path and `.vd-btn-spinner`.
- Keep solid-variant spinner colours exactly as they are today.
- Stay pure CSS; no component API change.

**Non-Goals:**

- Replacing `color: transparent` with another label-hiding technique (see
  Decisions).
- Changing spinner geometry, animation, or reduced-motion behaviour.
- Teaching outline as a `VdButton` prop (still CSS-only classes).

## Decisions

### Keep `color: transparent`; add accent colour overrides

**Chosen.** Mirror the solid-variant pattern: for each outline/ghost accent,
set `border-color` (and `border-right-color: transparent`) on
`.…is-loading::after` and on `.… .vd-btn-spinner`.

**Rejected: `-webkit-text-fill-color: transparent` while leaving `color`
alone.** That would let `currentColor` keep the accent for every treatment in
one rule, but SVG / `currentColor` icons inside the button would stay visible
during loading (today `color: transparent` blanks them). Worse trade-off for a
patch, and it depends on a prefixed property for a behaviour the cascade
already expresses with explicit colours.

**Rejected: custom property snapshot of `currentColor` before blanking.**
`currentcolor` inside a custom property resolves when the *using* property is
computed, not when the variable is declared — so
`--spinner: currentColor; color: transparent` still yields a transparent
spinner.

### Colour mapping

| Treatment | Spinner colour |
| --- | --- |
| plain `.vd-btn`, `.vd-btn-outline`, `-primary`, ghost / ghost-primary | `--vd-color-primary` (plain base uses `--vd-text-primary` for text; spinner uses brand primary so it reads as "busy" on both light and dark surfaces — same default as `.vd-btn-spinner` today) |
| outline/ghost secondary | `--vd-color-secondary` |
| outline/ghost success | `--vd-color-success` |
| outline warning | `--vd-color-warning` |
| outline error/danger, ghost error | `--vd-color-error` |
| outline info | `--vd-color-info` |
| ghost-subtle | `--vd-text-muted` |

Plain `.vd-btn` uses text-primary, not primary brand, for its label. Using
`--vd-color-primary` for its spinner matches the existing `.vd-btn-spinner`
default and stays consistent with outline/ghost-primary.

## Risks / Trade-offs

- **[Risk] Docs-site temporary compensate duplicates these rules** → Mitigation:
  vd3-docs drops its `docs.css` patch when it bumps to `^1.2.1`; until then
  both agree on the same colours, so no visual conflict.
- **[Trade-off] Explicit selector list grows with each new outline/ghost
  accent** → Acceptable; the solid list already works the same way, and adding
  a colour is a one-block change.

## Migration Plan

1. Land on `dev-v121`, publish `@vanduo-oss/vd3@1.2.1`.
2. vd3-docs bumps the dependency and deletes the temporary compensate.
3. Rollback: revert the CSS block; solid buttons are unaffected either way.
