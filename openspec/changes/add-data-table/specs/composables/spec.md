# composables

## ADDED Requirements

### Requirement: use-table-state-export

`useTableState` MUST be a named export from the package root alongside the
other composables, with the behaviour specified under the `data-table`
capability.

#### Scenario: root export

- **GIVEN** the built package
- **WHEN** named exports are enumerated
- **THEN** `useTableState` SHALL be present
