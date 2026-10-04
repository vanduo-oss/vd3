## ADDED Requirements

### Requirement: Verified correctness and documentation
The library and documentation SHALL preserve existing public imports while correcting reproduced behavior.

#### Scenario: Theme-derived accents
- **GIVEN** a built-in primary, palette and explicit or system color scheme
- **WHEN** primary RGB and alpha colors are rendered
- **THEN** they MUST follow the active semantic primary and remain valid CSS

#### Scenario: Popover anchor moves
- **GIVEN** an open target-panel popover
- **WHEN** a scroll ancestor or viewport changes its position
- **THEN** its coordinates MUST update even when placement does not flip or flipping is disabled

#### Scenario: Quality checks cover their claimed files
- **GIVEN** either repository
- **WHEN** lint and relevant tests run
- **THEN** standalone TypeScript MUST be included, copied key examples MUST typecheck, and rendered contrast checks MUST inspect actual CSS colors

#### Scenario: Consumer compatibility
- **GIVEN** an existing consumer
- **WHEN** it uses public imports, comma-separated RGB helpers or the flat token JSON map
- **THEN** these formats MUST remain compatible and documentation MUST disclose shared-state limitations

#### Scenario: Temporary docs theme previews
- **GIVEN** the docs bootstrap disables automatic library preference storage
- **WHEN** a component demo changes font, palette, radius, neutral, primary or mode, or invokes Reset
- **THEN** the page MUST reflect the preview without changing saved site-dock choices
- **AND** reload MUST restore brand defaults plus only the dock's saved mode and per-scheme primary

#### Scenario: Dock actions during a preview
- **GIVEN** temporary demo typography and other style parameters are active
- **WHEN** the actual site dock commits a mode or primary color
- **THEN** it MUST save only its own choices and MUST NOT save the temporary preview parameters
- **AND** hover previews MUST NOT count as committed primary selections

#### Scenario: Responsive component demos
- **GIVEN** desktop or mobile documentation
- **WHEN** footer columns, dock tint, Navbar menus or gradient separators render
- **THEN** footer columns MUST stack on mobile with full-width copyright, dark text contrast MUST remain readable, dock accent MUST reach brand and active icon, closed mobile menus MUST neither overflow nor expose interaction, and gradient colors MUST follow semantic primary/info

#### Scenario: Keyboard popover dismissal
- **GIVEN** a button trigger and a target-panel popover with positioning still pending
- **WHEN** Enter or Space activates it and Escape dismisses it
- **THEN** closed ARIA MUST remain closed and a later activation MUST open normally
