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
