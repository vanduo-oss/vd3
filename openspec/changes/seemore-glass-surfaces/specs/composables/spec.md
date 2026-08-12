## ADDED Requirements

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
