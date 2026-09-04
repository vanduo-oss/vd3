# composables

## ADDED Requirements

### Requirement: use-dock-orientation

The package root MUST export `useDockOrientation`: an instance-scoped morph
state machine. Each call SHALL create its own `orientation`, `visualPhase`,
`isMorphing`, `isNarrow`, and `placement` refs. Two concurrent instances MUST NOT share
those refs.

`playTo(target)` SHALL: force horizontal and return when narrow; ignore the
call while `isMorphing`; no-op (aside from optional persist write) when
already at the target rest; snap when `prefers-reduced-motion: reduce`;
otherwise set `visualPhase` to `square` for 480ms, then set `visualPhase`
and `orientation` to `target` and clear `isMorphing` after 720ms.

`toggle` SHALL play to the paired placement (`bottom` ↔ `left`, `top` ↔
`right`) when toggle is allowed.

Options: `narrowQuery` (default `(max-width: 520px)`), `persist` (default
false), `storageKey`, `initial` (default `"horizontal"` → placement
`"bottom"`), `initialPlacement`. When `persist` is
true the storage key SHALL be `getStoragePrefix() + "dock-orient"` unless
`storageKey` is set. Persist SHALL write the placement string (`bottom` |
`top` | `left` | `right`) and MUST still restore legacy `"horizontal"` /
`"vertical"` values as `"bottom"` / `"left"`. Restore from storage happens in
`onMounted` with no animation. Browser access MUST NOT run at setup.

`dockClasses` SHALL map `visualPhase` / `isMorphing` / `placement` to
`is-horizontal`, `is-square`, `is-vertical`, `is-morphing`, and
`vd-dock-edge-{placement}`.

Narrow viewports MUST force the pair's horizontal edge (`left` → `bottom`,
`right` → `top`) without writing storage. Widening MUST restore the last
chosen or stored edge.

#### Scenario: square waypoint

- **GIVEN** a wide viewport and no reduced motion
- **WHEN** `playTo("vertical")` is called from horizontal rest
- **THEN** `visualPhase` is `"square"` and `isMorphing` is true until 480ms
  elapse, after which `orientation` and `visualPhase` are `"vertical"`

#### Scenario: instance isolation

- **GIVEN** two `useDockOrientation` instances
- **WHEN** the first plays to `"vertical"`
- **THEN** the second SHALL remain `"horizontal"`

#### Scenario: reduced motion snaps

- **GIVEN** `prefers-reduced-motion: reduce`
- **WHEN** `playTo("vertical")` is called
- **THEN** `orientation` and `visualPhase` SHALL become `"vertical"`
  immediately and `isMorphing` SHALL be false

#### Scenario: narrow forces horizontal

- **GIVEN** `matchMedia("(max-width: 520px)")` matches
- **WHEN** `playTo("vertical")` is called
- **THEN** orientation SHALL stay or become `"horizontal"`

#### Scenario: persist uses the theme prefix

- **GIVEN** `persist: true` and `getStoragePrefix()` of `"app-"`
- **WHEN** orientation becomes `"vertical"`
- **THEN** `localStorage` SHALL contain `app-dock-orient` = `"left"`

### Requirement: use-table-state-export

`useTableState` MUST be a named export from the package root alongside the
other composables, with the behaviour specified under the `data-table`
capability.

#### Scenario: root export

- **GIVEN** the built package
- **WHEN** named exports are enumerated
- **THEN** `useTableState` SHALL be present

### Requirement: glass-scroll-activation-css-contract

`useGlass` MAY continue to toggle `.is-glass-active` on `[data-glass-scroll]`
elements via IntersectionObserver. The accompanying CSS contract MUST treat
backdrop blur as an instantaneous enable/disable when active state flips;
composables MUST NOT depend on animating `backdrop-filter` for the scroll
reveal effect.

#### Scenario: useGlass still toggles is-glass-active

- **GIVEN** a mounted `useGlass` root containing `[data-glass-scroll]`
- **WHEN** the observed element intersects
- **THEN** `.is-glass-active` is applied without requiring backdrop-filter
  transitions

### Requirement: liquid-gradient-composable

The package root MUST export `useLiquidGradient` and
`createLiquidGradient`. `useLiquidGradient(root: Ref<HTMLElement | null>,
options?: UseLiquidGradientOptions)` MUST scan descendants with
`.vd-liquid-gradient`, locate or create a
`.vd-liquid-gradient-canvas` child, and drive each with
`createLiquidGradient`. Browser APIs SHALL only run inside
`onMounted`/`onUnmounted` (or equivalent) so SSR import is safe. Every
listener, observer, and rAF the composable installs MUST be removed on
unmount, and each engine MUST be `destroy()`ed.

#### Scenario: exported from package root

- **GIVEN** the built package
- **WHEN** the root module's named exports are enumerated
- **THEN** `useLiquidGradient` and `createLiquidGradient` are present

#### Scenario: SSR-safe module evaluation

- **GIVEN** a non-browser environment
- **WHEN** the package root module is imported
- **THEN** no WebGL or DOM API is touched during evaluation

#### Scenario: teardown on unmount

- **GIVEN** a harness using `useLiquidGradient` over a
  `.vd-liquid-gradient` host
- **WHEN** the harness unmounts
- **THEN** pointer/resize listeners and theme observers are disconnected
  and engines are destroyed

#### Scenario: graceful WebGL absence

- **GIVEN** `canvas.getContext('webgl')` returns null
- **WHEN** `createLiquidGradient` is called
- **THEN** it returns `null` and `useLiquidGradient` does not throw

#### Scenario: reduced motion

- **GIVEN** `prefers-reduced-motion: reduce`
- **WHEN** an engine starts
- **THEN** it draws a static frame with zero speed/distort and ignores
  pointer trails

#### Scenario: theme token binding

- **GIVEN** document theme tokens (`--vd-color-primary-rgb`,
  `--vd-neutral-*`, `--vd-bg-primary`, `data-theme`)
- **WHEN** `syncThemeColors` runs
- **THEN** shader colors update from those tokens (primary + neutral mix
  differs for light vs dark)
