# composables

## ADDED Requirements

### Requirement: use-tooltips-show-delay

`useTooltips` MUST accept an optional second argument
`{ showDelay?: number }`. When `showDelay` is a positive number, a tooltip
SHALL appear only after the pointer or focus has rested on the trigger for
that many milliseconds; when it is absent or `0`, the tooltip SHALL appear
synchronously (the 1.6.0 behavior). A per-trigger `data-tooltip-delay`
attribute (non-negative integer milliseconds) MUST override the option for
that trigger.

A pending show MUST be cancelled when the pointer leaves or focus moves off
the trigger before the delay elapses, and on unmount, so a fast in-and-out
never paints a tooltip.

`useTooltips` MUST rescan its root for `[data-tooltip]` / `[data-tooltip-html]`
triggers via `MutationObserver` (`childList`, `subtree`, and the
`data-tooltip` / `data-tooltip-html` / `data-tooltip-delay` attribute filter),
so triggers added or relabelled after mount are wired. Rescans MUST be
idempotent — an already-wired trigger MUST NOT receive duplicate listeners —
and every listener plus the observer MUST be detached on unmount. The observer
MUST be guarded so SSR and jsdom-free environments do not throw.

#### Scenario: delayed show

- **GIVEN** a harness calling `useTooltips(root, { showDelay: 500 })` over a
  `[data-tooltip]` trigger
- **WHEN** the pointer enters the trigger and 400ms elapse
- **THEN** no `.vd-tooltip` exists
- **AND WHEN** a further 200ms elapse
- **THEN** a `.vd-tooltip` exists

#### Scenario: pending show is cancelled

- **GIVEN** the same harness with the pointer resting on the trigger for 200ms
- **WHEN** the pointer leaves and the full delay elapses
- **THEN** no `.vd-tooltip` is ever painted

#### Scenario: per-trigger delay overrides the option

- **GIVEN** a harness with `showDelay: 500` and a trigger carrying
  `data-tooltip-delay="0"`
- **WHEN** the pointer enters that trigger
- **THEN** a `.vd-tooltip` exists without advancing timers

#### Scenario: triggers added after mount are wired

- **GIVEN** a mounted harness whose root gains a new `[data-tooltip]` child
- **WHEN** the pointer enters the new child and the delay elapses
- **THEN** a `.vd-tooltip` exists with that child's text
