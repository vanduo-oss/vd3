## ADDED Requirements

### Requirement: theme-preference-singleton

The theme layer MUST export `useThemePreference()` — a module-scope
reactive singleton (useToast pattern; no pinia) that is the de-pinia'd
replacement for vd2's theme store and the shared state behind
`VdThemeSwitcher` and `VdThemeCustomizer`. It SHALL lazily initialize
from `loadPreference()` on first client call (SSR-safe: no storage or DOM
access at import time; the documented process-global caveat applies) and
expose the six reactive preference fields (`palette`, `theme`, `primary`,
`neutral`, `radius`, `font`) plus setter verbs mirroring vd2's store API
— `setTheme`, `setPalette`, `setPrimary`, `setNeutral`, `setRadius`,
`setFont`, and `reset` (restoring `defaultPreference()`). Every setter
MUST route through the existing `applyPreference()` and
`persistPreference()` so the `data-*` attribute contract and `vanduo-*`
storage keys stay the single source of truth; `setTheme` SHALL re-derive
the default primary per the existing `defaultPrimary` rules. While the
preference is `system`, the singleton MUST track
`prefers-color-scheme` changes and re-apply — the media listener is
refcounted (attached with the first consumer mount, detached when the
last unmounts).

#### Scenario: singleton is shared

- **GIVEN** two components calling `useThemePreference()`
- **WHEN** one calls `setPrimary("indigo")`
- **THEN** the other observes `primary === "indigo"` reactively, `<html>`
  carries `data-primary="indigo"`, and
  `localStorage["vanduo-primary-color"]` is `indigo`

#### Scenario: lazy client initialization

- **GIVEN** localStorage seeded with `vanduo-radius: "0.25"`
- **WHEN** `useThemePreference()` is first called in a client harness
- **THEN** the state reflects the stored radius, and merely importing the
  package root touched neither storage nor DOM

#### Scenario: reset restores defaults

- **GIVEN** a customized singleton state
- **WHEN** `reset()` runs
- **THEN** the fields equal `defaultPreference()` and the `data-*`
  attributes and storage reflect the defaults

#### Scenario: system preference tracking

- **GIVEN** the singleton at `theme: "system"` with a mounted consumer
- **WHEN** the `prefers-color-scheme: dark` media query flips to matching
- **THEN** the preference is re-applied for the dark scheme (default
  primary re-derived), and after the last consumer unmounts the media
  listener is detached
