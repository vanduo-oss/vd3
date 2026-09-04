# css-distribution

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

### Requirement: liquid-gradient-effect-css

Layer 5 of the authored CSS tree MUST import
`effects/liquid-gradient.css`. That file MUST define:

- Host `.vd-liquid-gradient` with default `--vd-liquid-*` customization
  variables (speed, intensity, grain, distort, gradient-size,
  primary-weight, neutral-weight, alpha) matching Labs defaults.
- Canvas child `.vd-liquid-gradient-canvas` filling the host.
- Active visibility helper `.vd-liquid-gradient-active`.
- Optional layout modifiers `.vd-liquid-gradient-fixed` (viewport fill)
  and `.vd-liquid-gradient-fill` (absolute inset fill of a positioned
  parent).
- Host `pointer-events: none` so the decorative layer does not intercept
  clicks.

MIT attribution for the inspired CodePen MUST appear in the CSS/JS headers
and in `THIRD-PARTY-LICENSES`.

#### Scenario: Layer 5 import

- **GIVEN** `css/vd3.css`
- **WHEN** Layer 5 Effects imports are listed
- **THEN** `effects/liquid-gradient.css` is included

#### Scenario: customization tokens present

- **GIVEN** the built `vd3.min.css`
- **WHEN** searched for `--vd-liquid-speed` and related tokens
- **THEN** each documented `--vd-liquid-*` token is defined

#### Scenario: third-party notice

- **GIVEN** `THIRD-PARTY-LICENSES`
- **WHEN** read
- **THEN** it lists Cameron Knight’s Interactive Liquid Gradient CodePen
  as MIT with the CodePen URL and adapted-in paths

### Requirement: native-select-chevron-longhands

Every non-multi native select caret rule that sets a chevron
`background-image` (base, `:focus`, `:disabled`, and
`[data-theme="dark"]` variants for `select.vd-input`, bare `select`,
`.select-input`, `.custom-select-input`, and `.custom-select-button`)
MUST also set `background-repeat: no-repeat`,
`background-position: right 0.75rem center`, and
`background-size` matching the control size (default
`var(--vd-select-arrow-size) 12px`). Multi-select rules that clear the
caret with `background-image: none` MUST keep no caret image and are
exempt from the longhand co-declaration requirement. This MUST hold in
authored `css/components/forms.css` and in the built `dist/vd3.min.css`
/ `dist/vd3-core.min.css` bundles so a consumer `background` shorthand
cannot leave a tiling chevron when a later state rule re-applies only
the image.

#### Scenario: Focus re-applies caret longhands

- **GIVEN** the authored select `:focus` rule that swaps the chevron
  `background-image`
- **WHEN** the rule is inspected
- **THEN** it MUST also declare `background-repeat: no-repeat`,
  `background-position: right 0.75rem center`, and the default caret
  `background-size`

#### Scenario: Dark theme caret states re-apply longhands

- **GIVEN** `[data-theme="dark"]` select / custom-select-button rules
  (default, `:focus`, and `:disabled`) that set a chevron
  `background-image`
- **WHEN** each rule is inspected
- **THEN** each MUST also declare `background-repeat: no-repeat`,
  `background-position: right 0.75rem center`, and the default caret
  `background-size`

#### Scenario: Disabled caret keeps longhands

- **GIVEN** the authored select `:disabled` rule that sets a muted
  chevron `background-image`
- **WHEN** the rule is inspected
- **THEN** it MUST also declare `background-repeat: no-repeat`,
  `background-position: right 0.75rem center`, and the default caret
  `background-size`

#### Scenario: Built bundles keep longhands with caret images

- **GIVEN** a completed CSS build
- **WHEN** `dist/vd3.min.css` is searched for select caret state
  overrides that embed a chevron SVG `background-image`
- **THEN** those overrides MUST also carry `background-repeat:no-repeat`
  (minified form) alongside position and size so the tiling regression
  cannot ship
