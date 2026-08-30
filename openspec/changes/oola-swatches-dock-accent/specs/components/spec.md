# components

## MODIFIED Requirements

### Requirement: vd-theme-customizer-component

`VdThemeCustomizer` MUST be the promotion of
`vd2/src/overlays/VdThemeCustomizer.vue` (236 lines), de-pinia'd onto the
theme-preference singleton: a `.vd-theme-customizer` root with the
paint-roller trigger (`aria-label`, `aria-expanded`), a body-teleported
`.vd-theme-customizer-overlay` and `.vd-theme-customizer-panel`
(`role="dialog"`, labelled, `is-open` state, positioned under the trigger
on desktop widths and reset on mobile), and `tc-*` sections rendering
`PRIMARY_COLORS` swatches, `NEUTRAL_COLORS` swatches, `RADIUS_OPTIONS`
buttons, and the `FONT_OPTIONS` select — each control marking the active
value and writing through the singleton's setters (font selection covers
the absorbed `font-switcher.js` capability: `data-font` application with
removal for `system`, `vanduo-font-preference` persistence). A
**`show-palette` prop (default `false`)** SHALL additionally render the
`PALETTE_OPTIONS` section wired to `setPalette` when true. The panel MUST
close on Escape, on overlay click, and on outside pointerdown via
`useClickOutside` (trigger excluded); it SHALL open on the
`vd:open-customizer` window event and expose `open`/`close`/`toggle`. The
reset control MUST restore the singleton defaults. All window listeners
are removed on unmount.

A **`variant` prop (`panel` | `swatches`, default `panel`)** SHALL select the
presentation. `panel` is the behavior described above and MUST be unchanged.

`swatches` SHALL render a body-teleported `.vd-theme-customizer-fan`
(`role="listbox"`, labelled) of `.tc-fan-item` blades (`role="option"`,
`aria-selected`, `aria-label` from the color name, `data-color`) in place of
the overlay and panel, and the trigger SHALL use the `ph-swatches` icon
instead of `ph-paint-roller`. The trigger element, its classes, and
`data-theme-customizer-trigger` MUST be identical across variants. Each blade
MUST carry a `.tc-fan-label` and a `.tc-fan-swatch` whose
`--vd-swatch-color` is the color value. The swatches variant owns **primary
only** — it MUST NOT render palette, neutral, radius, font, or reset controls.

The fan MUST be hinged at the trigger center: the fan root is positioned in
fixed coordinates at that point and each blade is rotated to its own fan angle
and pushed out along its own axis, so all blades pivot around one origin. The
fan MUST fit itself inside the viewport by shrinking the arc (from 120° down to
a 30° floor) and tilting the base angle so every blade tip stays on screen, and
MUST re-fit on resize, on scroll, and when `direction` changes.

A **`swatches` prop (`readonly string[]`)** SHALL restrict the offered blades to
those `PRIMARY_COLORS` keys, preserving `PRIMARY_COLORS` order; unset offers all
of `PRIMARY_COLORS`, and unknown keys MUST be ignored.

A **`direction` prop (`auto` | `up` | `down` | `left` | `right`, default
`auto`)** SHALL set the fan axis and apply `.fan-{direction}` to the fan root.
`auto` MUST resolve from the trigger rect by fanning away from the nearest
viewport edge, and MUST re-resolve on reposition.

A **`preview` prop (default true)** SHALL apply a blade's hue on pointer enter
and restore the value captured at open time when the pointer leaves the fan or
the fan closes without a selection. With `preview` false, only an explicit
selection SHALL change the hue.

An optional **`primary` prop** SHALL switch the component into controlled mode.
When bound, the active value MUST be read from the prop, every change
(preview, restore, and commit) MUST be emitted as `update:primary`, and the
component MUST NOT call the singleton's `setPrimary`. When unbound, the
component MUST read `prefs.primary` and write `setPrimary` as before. Controlled
mode MUST apply to both variants.

#### Scenario: swatch writes through the theme layer

- **GIVEN** an open customizer
- **WHEN** a primary swatch with key `indigo` is clicked
- **THEN** `<html>` carries `data-primary="indigo"`,
  `localStorage["vanduo-primary-color"]` is `indigo`, and the swatch has
  `is-active`

#### Scenario: panel is the default variant

- **GIVEN** `VdThemeCustomizer` mounted with no `variant`
- **WHEN** the trigger is clicked
- **THEN** a `.vd-theme-customizer-panel` opens, no
  `.vd-theme-customizer-fan` exists, and the trigger icon is
  `ph-paint-roller`

#### Scenario: swatches variant fans the restricted set

- **GIVEN** `variant="swatches"` with `:swatches="['blue', 'teal', 'pink']"`
- **WHEN** the trigger is clicked
- **THEN** a `.vd-theme-customizer-fan[role="listbox"]` holds exactly three
  `.tc-fan-item[role="option"]` blades in `PRIMARY_COLORS` order, no
  `.vd-theme-customizer-panel` exists, and the trigger icon is `ph-swatches`

#### Scenario: controlled mode does not write the singleton

- **GIVEN** `variant="swatches"` with `:primary="'blue'"` bound
- **WHEN** the `teal` blade is clicked
- **THEN** `update:primary` is emitted with `teal`,
  `localStorage["vanduo-primary-color"]` is untouched, and the active blade
  stays `blue` until the parent updates the prop

#### Scenario: preview restores on cancel

- **GIVEN** an open uncontrolled fan whose primary is `blue`
- **WHEN** the pointer enters the `pink` blade and then leaves the fan without
  clicking
- **THEN** `data-primary` is `pink` while hovered and back to `blue` after the
  pointer leaves

#### Scenario: fan closes like the panel

- **GIVEN** an open fan
- **WHEN** Escape is pressed, or a pointerdown lands outside the fan and
  trigger
- **THEN** the fan loses `is-open` and the primary captured at open time is
  restored

#### Scenario: palette section is opt-in

- **GIVEN** one customizer with defaults and one with `show-palette`
- **WHEN** their panels render
- **THEN** only the `show-palette` instance contains the palette section,
  and choosing `fibonacci` there sets `data-palette="fibonacci"`

#### Scenario: font select absorbs the font switcher

- **GIVEN** an open customizer
- **WHEN** the font select changes to a non-system font, then back to
  `system`
- **THEN** `data-font` is set then removed on `<html>` and
  `vanduo-font-preference` tracks both writes

#### Scenario: close paths

- **GIVEN** an open panel
- **WHEN** Escape is pressed (or the overlay is clicked, or a pointerdown
  lands outside panel and trigger)
- **THEN** the panel loses `is-open` and the trigger reports
  `aria-expanded="false"`

#### Scenario: reset restores defaults

- **GIVEN** a customized primary, radius, and font
- **WHEN** "Reset to Defaults" is clicked
- **THEN** the singleton returns to `defaultPreference()` values and the
  `data-*` attributes reflect them

## ADDED Requirements

### Requirement: vd-dock-tint-mode

`VdDock` MUST accept a **`tintMode` prop (`surface` | `accent`, default
`surface`)** controlling how `tint` is applied. `surface` MUST keep painting
the dock background from the tint hue (the 1.6.0 behavior). `accent` MUST add
`.vd-dock-tint-accent` alongside `.vd-dock-tint-{hue}` so the pill renders as
constant ink while `--vd-dock-tint` stays set for items and the `#brand` slot
to consume. An out-of-range `tintMode` MUST fall back to `surface`, and
`tintMode="accent"` without a `tint` MUST be a no-op.

The package root MUST export `DOCK_TINT_MODES` and `DockTintMode` alongside
the other `DOCK_*` constants and types.

#### Scenario: accent tint keeps the hue but not the surface

- **GIVEN** `VdDock` with `tint="blue"` and `tint-mode="accent"`
- **WHEN** the DOM is inspected
- **THEN** the root carries both `vd-dock-tint-blue` and
  `vd-dock-tint-accent`

#### Scenario: surface is the default tint mode

- **GIVEN** `VdDock` with `tint="blue"` and no `tint-mode`
- **WHEN** the DOM is inspected
- **THEN** the root carries `vd-dock-tint-blue` and does not carry
  `vd-dock-tint-accent`
