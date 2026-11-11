## ADDED Requirements

### Requirement: Fibonacci duration tokens

The motion stylesheet SHALL define duration tokens at the Fibonacci millisecond steps `--vd-duration-0` (0ms), `--vd-duration-55` (55ms), `--vd-duration-89` (89ms), `--vd-duration-144` (144ms), `--vd-duration-233` (233ms), `--vd-duration-377` (377ms), `--vd-duration-610` (610ms), and `--vd-duration-987` (987ms).

#### Scenario: Token values match the Fibonacci scale

- **WHEN** `css/core/motion.css` is applied
- **THEN** each duration token listed in this requirement MUST equal its millisecond value

### Requirement: Semantic duration aliases

The motion stylesheet SHALL alias `--vd-duration-instant` to 89ms, `--vd-duration-fast` to 144ms, `--vd-duration-base` to 233ms, `--vd-duration-slow` to 377ms, `--vd-duration-slower` to 610ms, and `--vd-duration-slowest` to 987ms.

#### Scenario: Aliases resolve to Fibonacci steps

- **WHEN** the semantic duration aliases are computed
- **THEN** each alias MUST resolve to the duration named in this requirement

### Requirement: Golden easing curves

The motion stylesheet SHALL define `--vd-ease-out` as `cubic-bezier(0.236, 1, 0.382, 1)`, `--vd-ease-in` as `cubic-bezier(0.618, 0, 0.764, 0)`, `--vd-ease-in-out` as `cubic-bezier(0.618, 0, 0.382, 1)`, and `--vd-ease-linear` as `cubic-bezier(0, 0, 1, 1)`.

#### Scenario: Easing tokens use the golden curves

- **WHEN** `css/core/motion.css` is applied
- **THEN** each easing token MUST use the cubic-bezier named in this requirement

### Requirement: Motion mode attribute

`setMotion` SHALL accept `auto`, `full`, `reduce`, and `off`. `auto` MUST remove `data-motion`. The other modes MUST set `data-motion` to that value. `reduce` MUST remove spatial shift and scale and MUST collapse durations from 144ms upward to the 89ms crossfade. `off` MUST set motion durations to 0ms. With no attribute, or with `auto`, a `prefers-reduced-motion: reduce` match MUST apply that same collapse. `full` MUST keep the full duration scale when the OS prefers reduced motion.

#### Scenario: Reduce mode

- **WHEN** `setMotion("reduce")` runs in the browser
- **THEN** `data-motion` MUST be `reduce` and spatial motion tokens MUST be neutralized

#### Scenario: Off mode

- **WHEN** `setMotion("off")` runs in the browser
- **THEN** `data-motion` MUST be `off` and the duration tokens MUST compute to 0ms

#### Scenario: Auto follows the OS

- **WHEN** `setMotion("auto")` runs and the OS prefers reduced motion
- **THEN** `data-motion` MUST be absent and durations from 144ms upward MUST collapse to the 89ms crossfade

#### Scenario: Full overrides the OS

- **WHEN** `setMotion("full")` runs while the OS prefers reduced motion
- **THEN** `data-motion` MUST be `full` and the reduced-motion duration collapse MUST NOT apply

### Requirement: VdTransition presets

`VdTransition` SHALL provide the presets `fade`, `scale`, `slide-up`, `slide-down`, `slide-left`, and `slide-right`, and it MUST default to `fade`. A numeric `duration` MUST set `--vd-transition-duration` on the transitioning element for the active phase and clear that property when the phase ends. Motion off MUST skip the transition.

#### Scenario: Default preset

- **WHEN** `VdTransition` is used without a preset name
- **THEN** the transition MUST use the `vd-fade` classes

#### Scenario: Duration override

- **WHEN** a numeric `duration` is set
- **THEN** the transitioning element MUST receive `--vd-transition-duration` in milliseconds during the active phase

### Requirement: Expand transition height durations

`VdExpandTransition` SHALL animate height and opacity. When no duration is passed and `--vd-expand-duration` is unset, the duration MUST follow content height: 144ms at or below 144px, 233ms at or below 377px, 377ms at or below 987px, and 610ms above that. Reduced motion MUST crossfade opacity for 89ms without interpolating height. A disabled animation, motion off, or a missing Web Animations `animate` MUST finish without a height animation.

#### Scenario: Mid-height content

- **WHEN** the content height is 500px and no duration override is set
- **THEN** the expand duration MUST be 377ms

#### Scenario: Reduced motion

- **WHEN** motion is reduced
- **THEN** the transition MUST crossfade opacity for 89ms and MUST NOT interpolate height

### Requirement: Dock waypoint morph

A dock placement change SHALL travel through a square waypoint anchored by `dockMorphCornerOf`, then grow into the target edge. The shrink phase MUST last 377ms (`DOCK_MORPH_MS.shrink`, `--vd-duration-slow`) and the grow phase MUST last 610ms (`DOCK_MORPH_MS.grow`, `--vd-duration-slower`). Adjacent edges MUST share a corner: bottom with left is bottom-left, left with top is top-left, top with right is top-right, and right with bottom is bottom-right.

#### Scenario: Bottom to left

- **WHEN** the dock morphs from bottom to left
- **THEN** the square waypoint MUST be anchored bottom-left for 377ms and the dock MUST reach the left edge after the following 610ms

### Requirement: Dock morph fallbacks and reduced motion

For a placement pair that is not an adjacent edge, `dockMorphCornerOf` MUST return top-left when either edge is top, otherwise top-right when either edge is right, otherwise bottom-left. `prefers-reduced-motion: reduce`, `data-motion="reduce"`, and `data-motion="off"` MUST snap to the target edge with no square waypoint. `data-motion="full"` MUST play the waypoint even when the OS prefers reduced motion.

#### Scenario: Non-adjacent pairs

- **WHEN** the corner is resolved for top/bottom, right/left, or bottom/bottom
- **THEN** the corners MUST be top-left, top-right, and bottom-left respectively

#### Scenario: Reduced motion snaps

- **WHEN** a placement change runs under reduced motion or `data-motion` `reduce` or `off`
- **THEN** the dock MUST appear on the target edge without entering the square phase

#### Scenario: Full motion ignores the OS

- **WHEN** `data-motion` is `full` and the OS prefers reduced motion
- **THEN** the dock MUST play the square waypoint
