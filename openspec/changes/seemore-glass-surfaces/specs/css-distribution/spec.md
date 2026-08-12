## ADDED Requirements

### Requirement: seemore-glass-fibonacci-steps

Layer 5 `effects/glass.css` MUST define Fibonacci strength-step modifiers
`.vd-glass-1`, `.vd-glass-2`, `.vd-glass-3`, `.vd-glass-5`, `.vd-glass-8`,
`.vd-glass-13`, `.vd-glass-21`, `.vd-glass-34`, `.vd-glass-55`, and
`.vd-glass-89`. Each step MUST set a coherent bundle of
`--vd-glass-blur`, `--vd-glass-bg-opacity` (tint), `--vd-glass-border-alpha`
(edge), and related saturate / noise / shadow tokens so blur, tint, and edge
scale together. Base `.vd-glass` / `.vd-glass-md` MUST resolve to step 5.
Legacy `.vd-glass-sm`, `.vd-glass-lg`, and `.vd-glass-xl` MUST remain as
aliases for steps 3, 8, and 13 respectively.

Blur for steps 1–21 MUST follow the Seemore table (step 1 → 2px … step 21 →
20px GPU soft-cap). Steps 34 / 55 / 89 MAY raise blur modestly (≤26px) while
escalating tint, border, saturate, grain, and shadow more aggressively; step
89 is the marketing extreme (~100 ceiling; fib 144 omitted). Navbar scrolled
frost SHOULD remain at the step-21 soft-cap. Scroll-activated glass
(`[data-glass-scroll]`) MUST NOT transition `backdrop-filter`; inactive state
may disable blur immediately while animating background, border, shadow, and
overlay opacity only. `prefers-reduced-transparency: reduce` MUST disable
backdrop blur and raise opacity to a near-opaque solid using `--vd-bg-primary`
(or equivalent) for all fib steps and aliases. An optional
`.vd-glass-adaptive` modifier MAY tint from theme primary / light-dark
neutrals without changing the fib step.

#### Scenario: fib step classes ship in the bundle

- **GIVEN** a completed CSS build
- **WHEN** `dist/vd3.css` is searched for `.vd-glass-1` through `.vd-glass-89`
- **THEN** each Fibonacci step selector is present

#### Scenario: base glass is step 5

- **GIVEN** `.vd-glass` / `.vd-glass-md` without a size override
- **WHEN** computed `--vd-glass-blur` defaults are read from tokens / glass.css
- **THEN** the default blur is `8px` (Fibonacci step 5)

#### Scenario: legacy aliases map to fib steps

- **GIVEN** `.vd-glass-sm`, `.vd-glass-lg`, `.vd-glass-xl`
- **WHEN** their custom properties are compared to steps 3 / 8 / 13
- **THEN** each alias matches its corresponding fib step bundle

#### Scenario: scroll glass does not transition backdrop-filter

- **GIVEN** `[data-glass-scroll]` rules in `effects/glass.css`
- **WHEN** the `transition` declaration is inspected
- **THEN** it does not list `backdrop-filter` or `-webkit-backdrop-filter`

### Requirement: decorative-surfaces-effect-css

Layer 5 of the authored CSS tree MUST import `effects/surfaces.css`. That
file MUST define base `.vd-surface` plus variant classes
`.vd-surface-mesh`, `.vd-surface-stripe`, `.vd-surface-noise`,
`.vd-surface-aurora`, `.vd-surface-dots`, and `.vd-surface-grid`, and
Fibonacci intensity modifiers `.vd-surface-3`, `.vd-surface-5`, and
`.vd-surface-8` that adjust pattern-layer opacity/contrast (not blur).

#### Scenario: Layer 5 import

- **GIVEN** `css/vd3.css`
- **WHEN** Layer 5 Effects imports are listed
- **THEN** `effects/surfaces.css` is included after `effects/glass.css`

#### Scenario: surface variants present

- **GIVEN** the built `vd3.css`
- **WHEN** searched for surface variant selectors
- **THEN** mesh, stripe, noise, aurora, dots, and grid classes are defined
