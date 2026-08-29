# components

## ADDED Requirements

### Requirement: vd-dock-component

The package root MUST export `VdDock`: a slot-driven glass dock (`#brand`,
default items, `#actions`) rendered as `<nav class="vd-dock">`. It SHALL
support `v-model:orientation` (`horizontal` | `vertical`), `v-model:placement`
(`bottom` | `top` | `left` | `right`, default `bottom`), `position`
(`fixed` | `contained`, default `fixed`), `dark` (default true), `tint`
(`red` | `orange` | `yellow` | `green` | `teal` | `blue` | `violet` | `pink`),
`glass` (Seemore steps `1` | `2` | `3` | `5` | `8` | `13` | `21` | `34`,
default `34`), `radius` (dock-own scale, default `1.25`), `itemLayout`
(`stack` | `inline`, default `stack`), `brandToggles` (default true),
`persist` (default false), `cycle` (`pair` | `edges`, default `pair`), and
`label` (default `"Primary"`).

Brand click SHALL toggle orientation when `brandToggles` is true and the
viewport is not narrow. The brand control MUST set `aria-pressed` when
orientation is vertical and MUST be disabled when toggle is unavailable.
The root MUST apply `.vd-glass` plus `.vd-glass-{glass}` and phase classes
`is-horizontal` | `is-square` | `is-vertical` | `is-morphing` and
`vd-dock-edge-{bottom|top|left|right}`. Brand click SHALL toggle the opposite
axis of the current pair (`bottom` ↔ `left`, `top` ↔ `right`) when
`cycle` is `pair` (the default). When `cycle` is `edges`, brand click SHALL
walk `bottom` → `left` → `top` → `right` → `bottom`. Default `toggle()`
MUST remain the pair morph.

`position="contained"` MUST use absolute positioning relative to the nearest
positioned ancestor. `position="fixed"` MUST attach to the viewport.

`--vd-dock-radius` MUST default to `1.25rem` and MUST NOT read
`--vd-radius-scale`. Allowed radius values: `0.5`, `0.75`, `1`, `1.25`,
`1.5`, `2`, `9999`. The global theme `RadiusOption` list MUST remain capped
at `0.5`.

The component MUST NOT bake an oola / ū mark. Brand content is the `#brand`
slot. The component MUST NOT pad the document.

#### Scenario: default chrome classes

- **GIVEN** `VdDock` mounted with a brand slot
- **WHEN** the DOM is inspected
- **THEN** the root is `nav.vd-dock.vd-dock-fixed.vd-glass.vd-glass-34` with
  `is-horizontal` and `aria-label="Primary"` and `vd-dock-edge-bottom`

#### Scenario: placement morph pair

- **GIVEN** `VdDock` with `placement="top"`
- **WHEN** the brand button is clicked on a wide viewport
- **THEN** `update:placement` SHALL emit `"right"` after the morph and the root
  SHALL have `.vd-dock-edge-right`

#### Scenario: edges cycle

- **GIVEN** `VdDock` with `cycle="edges"` on a wide viewport
- **WHEN** the brand button is clicked four times
- **THEN** `update:placement` SHALL emit `left`, then `top`, then `right`,
  then `bottom`

#### Scenario: orientation v-model toggle

- **GIVEN** `VdDock` with `brandToggles` and a wide viewport
- **WHEN** the brand button is clicked
- **THEN** `update:orientation` SHALL emit `"vertical"` after the morph (or
  immediately when reduced motion is preferred)

#### Scenario: contained position

- **GIVEN** `VdDock` with `position="contained"`
- **WHEN** the DOM is inspected
- **THEN** the root SHALL have `.vd-dock-contained` and MUST NOT have
  `.vd-dock-fixed`

#### Scenario: tint and radius

- **GIVEN** `VdDock` with `tint="violet"` and `radius="2"`
- **WHEN** the DOM is inspected
- **THEN** the root SHALL have `.vd-dock-tint-violet` and
  `--vd-dock-radius` resolving to `2rem`

#### Scenario: persist default off

- **GIVEN** `VdDock` mounted without `persist`
- **WHEN** orientation changes
- **THEN** `localStorage` MUST NOT receive a `*-dock-orient` key

### Requirement: vd-dock-item-component

The package root MUST export `VdDockItem`: a `button.vd-dock-item` with an
optional Phosphor `icon` (via `VdIcon`), a `.vd-dock-label`, and `active`.
When `active` is true the button SHALL have `.is-active` and
`aria-current="page"`.

#### Scenario: active item

- **GIVEN** `VdDockItem` with `label="Home"`, `icon="house"`, `active`
- **WHEN** the DOM is inspected
- **THEN** the button has `.is-active`, `aria-current="page"`, a `.vd-dock-label`
  whose text is `Home`, and a Phosphor house icon
