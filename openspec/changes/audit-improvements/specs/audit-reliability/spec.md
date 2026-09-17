## ADDED Requirements

### Requirement: Reviewed improvements preserve supported integrations

The package SHALL implement the accepted audit changes without silently discarding user state or breaking documented imports.

#### Scenario: Existing consumer updates

- **Given** a consumer using the documented package imports
- **When** the audited interactions and updates are exercised
- **Then** the behavior MUST meet the item-specific acceptance criteria in the audit backlog and have regression coverage

### Requirement: Sanitizer deny-lists unsafe attributes on anchors

Default sanitizer output SHALL apply the same attribute allowlist to anchors as to other allowed tags.

#### Scenario: Unsafe anchor attributes are removed

- **Given** HTML containing an anchor with an event handler or style attribute
- **When** it is sanitized with default options
- **Then** those attributes MUST be absent from the result

### Requirement: Tooltip trigger and surface stay distinct

VdTooltip SHALL render the trigger in normal flow and a separate tooltip surface.

#### Scenario: Keyboard and pointer use one placement contract

- **Given** a tooltip with shipped CSS
- **When** the trigger is hovered or focused
- **Then** one tooltip surface is shown, connected by aria-describedby, and Escape or blur dismisses it

### Requirement: No tokens-only CSS or core-only JS export in this change

`./css/core` SHALL remain the full stylesheet without icon fonts. Token JSON remains `./tokens.json`.

#### Scenario: Export evaluation is recorded without shipping new entries

- **Given** the current public exports map
- **When** tokens-only CSS and core-only JS are evaluated
- **Then** those entries MUST NOT be added, and consumer documentation MUST state that `/css/core` is not tokens-only
