## ADDED Requirements

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
