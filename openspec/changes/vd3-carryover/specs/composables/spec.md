## ADDED Requirements

### Requirement: pure-composable-carryover

The package root MUST export the 18 pure composables carried from the old
`@vanduo-oss/vue` package — `useAffix`, `useDatepicker`, `useFocusTrap`,
`useGlass`, `useKeyboardNav`, `useMorph`, `useMorphBadges`,
`useNavbarGlassScroll`, `useParallax`, `useScrollspy`, `useSidenav`,
`useStepper`, `useSuggest`, `useTheme` (module), `useThemeBridge`,
`useTimepicker`, `useTooltips`, `useWaypoint` — with identical option
surfaces and behavior. All browser access SHALL occur inside
`onMounted`/`onScopeDispose`-style lifecycle hooks or behind
client guards so importing and calling during SSR is safe, and every
listener/observer a composable installs MUST be removed on unmount.

#### Scenario: carried composables are exported

- **GIVEN** the built package
- **WHEN** the root module's named exports are enumerated
- **THEN** all 18 carried composables are present

#### Scenario: SSR-safe module evaluation

- **GIVEN** a non-browser environment (no `window`/`document` at import time)
- **WHEN** the package root module is imported
- **THEN** no browser API is touched during evaluation

#### Scenario: teardown on unmount

- **GIVEN** a harness component using a carried composable that installs DOM
  listeners or observers (e.g. `useWaypoint`)
- **WHEN** the harness unmounts
- **THEN** the composable's listeners/observers are disconnected

### Requirement: excluded-delegating-composables

This change MUST NOT carry the 12 old-line composables that delegate to
`window.Vanduo*` globals or reproduce the framework's DOM-scan init pattern
— `useDropdown`,
`useDraggable`, `useImageBox`, `useRipple`, `useSpotlight`, `useTimeline`,
`useExpandingCards`, `useFlow`, `useTabs`, `useValidate`, `useSearch`,
`usePopover` — they are rewritten pure in the `vd3-rewrites` change. No
file under `src/` SHALL reference a
`window.Vanduo*` global or import `@vanduo-oss/framework`.

#### Scenario: excluded composables are absent

- **GIVEN** the built package
- **WHEN** the root module's named exports are enumerated
- **THEN** none of the 12 excluded composables appear

#### Scenario: no framework globals in the source tree

- **GIVEN** the `src/` tree
- **WHEN** it is searched for `window.Vanduo`, `Vanduo` global casts, or
  `@vanduo-oss/framework` imports
- **THEN** no match exists

### Requirement: toast-singleton

`useToast` MUST be implemented as a module-scope `reactive()` singleton with
no pinia import (pinia stays out of the peer dependencies), exposing the
exact public API of the old pinia store: `useToastStore()` and `useToast()`
returning `{ queue, show, dismiss, success, error, warning, info }`, the
`ToastType` / `ToastPosition` / `ToastEntry` / `ToastOptions` types, the
flexible `show()` signature (`show('msg')`, `show('msg', 'success', 3000)`,
`show('msg', { … })`, `show({ message, … })` — each returning the entry id),
and defaults mirroring `framework/js/components/toast.js`
(`duration: 5000`, `position: "top-right"`, `dismissible: true`,
`showProgress: true`, `solid: false`). The public API SHALL be locked by a
type-level test committed BEFORE the rewrite lands.

#### Scenario: type lock precedes the implementation

- **GIVEN** the change's task ordering
- **WHEN** the useToast rewrite is implemented
- **THEN** `tests/useToast-api.spec.ts` already pins the exported names,
  types, and `show()` overloads, and the rewrite passes it unmodified

#### Scenario: singleton is shared across callers

- **GIVEN** two components calling `useToast()` / `useToastStore()`
- **WHEN** one shows a toast
- **THEN** the other observes the same entry in the same reactive `queue`

#### Scenario: flexible show signature

- **GIVEN** the singleton
- **WHEN** `show("saved", "success", 3000)` and
  `show({ message: "hi", position: "bottom-center" })` are called
- **THEN** both return distinct string ids and the queued entries carry the
  given type/duration/position with unspecified fields at the framework
  defaults

#### Scenario: no pinia anywhere

- **GIVEN** the `src/` tree and `package.json`
- **WHEN** searched for `pinia`
- **THEN** no import and no dependency/peer entry exists

### Requirement: composable-behavior-specs

Every composable exported from the package root MUST have a jsdom behavior
spec that mounts a harness, drives the relevant DOM/events, and asserts the
composable's observable effects and its cleanup on unmount.

#### Scenario: every exported composable is covered

- **GIVEN** the composable exports in `src/index.ts`
- **WHEN** `pnpm test` runs
- **THEN** each has at least one passing behavior spec
