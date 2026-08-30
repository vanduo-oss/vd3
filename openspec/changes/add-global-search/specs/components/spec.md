## ADDED Requirements

### Requirement: VdGlobalSearch command palette

The library SHALL export `VdGlobalSearch` — a Teleport dialog with overlay,
grouped results, optional AI toggle, and keyboard navigation.

#### Scenario: Opens with Cmd/Ctrl+K

- **WHEN** `shortcut` is enabled and the user presses Cmd/Ctrl+K outside an editable field
- **THEN** the modal SHALL open and focus the search input

### Requirement: useGlobalSearch adapter injection

The composable SHALL accept a `GlobalSearchAdapter` with async `search(query, { ai })`.

#### Scenario: Queries the injected adapter

- **WHEN** the user types a query and the debounce window elapses
- **THEN** the composable SHALL call `adapter.search(query, { ai })` and expose the
  returned groups as results, without importing any search engine itself

#### Scenario: AI stays opt-in

- **WHEN** the AI toggle has not been enabled by the user
- **THEN** the composable SHALL pass `ai: false` to the adapter and render no AI notice
