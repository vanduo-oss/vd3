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
