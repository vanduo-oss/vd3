# Design notes — vd3-rewrites

## Context

The old vue repo's 12 excluded composables are thin lifecycle shims: on
mount they call `window.VanduoX.init(root)` (or `Vanduo.init`), on unmount
they call `window.VanduoX.destroyAll()`. The real behavior lives in
`framework/js/components/*.js`. Three of them (`useTabs`, `useValidate`,
`useFlow`) already reimplemented a subset in TypeScript instead of
delegating. The rewrites therefore have two donors each: the **shim**
defines the public API to preserve; the **vanilla source** defines the
behavior to reach parity with. Where the shim intentionally diverged from
the vanilla source to match the documented API (noted in its comments),
the shim's divergence wins — those were fixes-to-documented-intent.

## Goals / Non-Goals

**Goals:**

- Preserve every shim's public API (`useX(root: Ref<HTMLElement | null>)`
  callable exactly as before) while reaching vanilla behavior parity.
- Per-instance lifecycle correctness: wiring scoped to the caller's root,
  teardown removes exactly this instance's listeners/observers/DOM.
- SSR safety: zero browser access at import/call time; everything in
  `onMounted` / `onScopeDispose`.
- Keep diffs reviewable against both donors (name helpers after the
  vanilla functions where practical).

**Non-Goals:**

- Global registries of live instances, document auto-init, or any
  `window.*` publication.
- New CSS or markup contracts — the vanilla class/attribute contracts are
  the API.

## Decisions

### 1. Uniform composable contract: preserved signature + optional controller

Every rewrite keeps the shim signature and adds two documented, optional
extensions:

```ts
function useX(
  root: Ref<HTMLElement | null>,
  options?: UseXOptions,          // optional, defaults = vanilla defaults
): UseXReturn | void              // returned controller, ignorable
```

- Calling `useX(root)` exactly as old code did compiles and behaves the
  same — the return value is new but old call sites discard it (a `void`
  consumer of a value-returning function is source-compatible).
- Controllers expose the vanilla programmatic API where one existed
  (`show`/`open`/`close` for dropdown, `goTo`/`next`/`prev` for flow,
  `start`/`stop`/`next`/`prev` for spotlight, `validate`/`addRule` for
  validate, `refresh()` everywhere content is dynamic).
- `refresh()` replaces the framework's "call `init()` again after DOM
  changes" idiom: it re-scans the root and wires elements added since
  mount, idempotently (already-wired elements are tracked in a local
  `WeakSet`/`Map`, mirroring the framework's `instances` Map — but local
  to the composable instance, not module-global).

### 2. Per-instance teardown (deliberate divergence from the shims)

The old shims called `VanduoX.destroyAll()` on unmount, which tore down
**every** instance on the page — unmounting one component nuked its
siblings' wiring. The rewrites track their own cleanups and remove only
their own listeners/observers/generated DOM. This is a documented behavior
improvement, not a parity bug; the migration notes call it out.

### 3. usePopover = bubble.js + popover.js merge

The framework ships two overlapping primitives: `bubble.js` (click-only,
panel *built from attributes*, `[data-vd-bubble]`/`[data-vd-popover]`) and
`popover.js` (general primitive, *pre-authored panel* referenced by
`data-vd-popover-target`, click | hover | focus triggers, placement flip).
The old `usePopover` shim only wired the bubble global — the docs' popover
primitive was unreachable from Vue. Both CSS files (`bubble.css`,
`popover.css`) already ship in vd3.

Decision: **one `usePopover` export wiring both contracts**, dispatching on
markup: a trigger with `data-vd-popover-target` (or class
`.vd-popover-trigger`) gets the panel-primitive behavior; a trigger with
`data-vd-bubble` / `data-vd-popover` content attributes gets the
attribute-built bubble. Rationale: the shim's name already said "popover"
while wiring bubbles, so splitting into `useBubble` + `usePopover` would
break the preserved-API rule for existing bubble users; and the two share
positioning/outside-click/Escape machinery. Event names stay distinct
(`bubble:show/hide` vs `popover:show/hide`) for framework-listener parity.
Bubble HTML content (`data-vd-bubble-html`) goes through the existing
`utils/sanitizeHtml` (`allowStyle: false`, `allowSvg` opt-in attribute) —
the framework did the same via its global `sanitizeHtml`.

### 4. Module-scope singletons where the framework was singleton

Three behaviors are inherently page-global in the vanilla source and stay
singletons (useToast precedent — module-scope state, documented SSR
caveat, client-only touch):

- **useSearch registry**: sources must outlive any one component (the old
  shim's doc comment says exactly this). `register`/`unregister`/`list`/
  `query` keep `search.js` semantics verbatim (duplicate-name throw,
  frozen records, `label` defaulting to `name`, per-source `limit` default
  10, trimmed query, empty-query short-circuit, parallel fetch with
  per-source error capture, `AbortError` rethrow). `useSearch(root)` keeps
  accepting the ref (ignored, reserved) and returns the registry.
- **useImageBox backdrop**: one `.vd-image-box-backdrop` in `body`, shared
  by all triggers (vanilla parity). Created lazily on first mount, removed
  when the last consumer unmounts (refcount) — this is where per-instance
  teardown meets the shared resource.
- **useSpotlight tour**: only one tour can run; `start()` while active
  stops the previous tour first (vanilla parity).

### 5. useTabs / useValidate / useFlow: redesign away from DOM-scan init

These three were never delegators — they were partial TS reimplementations
wired once on mount. The rewrite completes them to vanilla parity and
makes them robust under Vue's patch-driven DOM: wiring is (re)computed via
`refresh()`, listeners prefer event delegation on the container over
per-child listeners where the vanilla used per-child wiring (so v-for
re-renders don't strand listeners), and state classes are (re)applied
idempotently. Their shim-era intentional divergences are kept:

- `useValidate`: `match:` resolves by element **id** first, then
  `[name]` (the docs demo uses ids; vanilla only did `[name]`).
- `useFlow`: bare `<button>`s inside `.vd-flow-indicators` are upgraded
  with `.vd-flow-indicator` (docs markup bridge).
- `useTabs` drops nothing — the shim was a strict subset of vanilla.

### 6. VdMenu un-defer: byte-faithful except the import

The donor `VdMenu.vue` (68 lines) already has the right markup, ARIA
roles, and `select` semantics; its only framework dependency is
`useDropdown`. It carries unmodified except that the import now hits the
pure rewrite. Anything the menu needs (`aria-haspopup="menu"` toggle,
focus-first-item on open, Escape-refocus, typeahead) must therefore come
from `useDropdown` parity — which is exactly what the dropdown requirement
specifies. No prop/emit/markup changes.

### 7. What "parity" excludes (accepted deltas)

- No `window.VanduoX` programmatic globals — controllers replace them.
- `Vanduo.register`/component-registry integration: gone with the IIFE.
- `dropdown.js`'s `open(selector)` / `tabs.js`'s `show('tab-id')`
  string-selector conveniences become controller methods taking elements/
  indices — document-wide selector lookups don't fit per-instance scope.
- Legacy alias classes the vanilla matched for Bootstrap-era markup
  (`[data-tabs]`, `.tab-item` parents, bare `[data-tab]`) are kept only
  where vd3 CSS styles them; the specs pin the `vd-*` contract.

## Risks / Trade-offs

- [Two-donor drift: shim API vs vanilla behavior] → each spec requirement
  names the vanilla source and pins the shim signature; behavior specs
  assert the vanilla state-class/ARIA/event contract directly.
- [Shared singletons vs per-instance teardown] → refcounted shared DOM
  (imagebox backdrop) and registry state that intentionally survives
  unmount (search) are called out per requirement; SSR caveat documented
  like useToast.
- [`useDraggable` size (819-line donor)] → the requirement splits into
  items/containers/zones/keyboard/touch scenarios so implementation and
  review can proceed facet by facet; touch behavior is specified but its
  jsdom spec may drive synthetic TouchEvents only for the threshold logic.
- [Menu regressions via dropdown rewrite] → `VdMenu` mount spec exercises
  open/close/select through the rewritten composable, not in isolation.

## Migration Plan

Additive pre-release change to the unpublished `0.1.0` package — no
rollout machinery. Old-line consumers get their composables back with the
same call sites; the per-instance-teardown and no-IIFE deltas are in the
migration notes.

## Open Questions

- None blocking. (Whether SFC wrappers — `VdCarousel`, `VdPopover` — should
  exist is explicitly future work, tracked outside this change.)
