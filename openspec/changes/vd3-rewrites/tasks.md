# Tasks

Rewrites are ordered smallest-donor-first so the shared conventions
(signature preservation, options/controller pattern, per-instance
teardown, `refresh()`) settle on easy cases before the big ones. Each
implementation task pairs with a jsdom behavior spec under
`tests/composables/` (kebab-case `use-*.spec.ts`) asserting the vanilla
state-class/ARIA/keyboard/event contract AND teardown.

## 1. Conventions (blocking the rest)

- [ ] 1.1 Define the shared rewrite contract in code: preserved
      `useX(root: Ref<HTMLElement | null>, options?)` signature, optional
      returned controller, instance-local wired-element tracking
      (WeakSet/Map), `refresh()` idiom, `onMounted`/`onScopeDispose`-only
      browser access, per-instance cleanup lists. Document it in a short
      `src/composables/README.md` note (internal convention, not exported).
- [ ] 1.2 Add a guard test extension: grep-based spec asserting no
      `window.Vanduo`, `Vanduo*` casts, or `@vanduo-oss/framework` imports
      anywhere under `src/` (extends the carryover guard to the new files).

## 2. Small rewrites

- [ ] 2.1 `useRipple` ← `framework/js/components/ripple.js` (74): wave
      spawn/position/size, `animationend` removal, teardown clears waves.
- [ ] 2.2 `tests/composables/use-ripple.spec.ts`: pointer-position wave,
      removal on animationend, teardown, sibling-instance isolation.
- [ ] 2.3 `useSearch` ← `framework/js/components/search.js` (107):
      module-scope registry singleton (register/unregister/list/query with
      the vanilla validation, freezing, defaults, parallel query,
      AbortError rethrow); `useSearch(root)` keeps working and returns the
      registry; SSR caveat doc comment (useToast precedent).
- [ ] 2.4 `tests/composables/use-search.spec.ts`: duplicate-name throw,
      frozen list, empty-query short-circuit, error isolation, abort
      rethrow, registry survives unmount.
- [ ] 2.5 `useExpandingCards` ← `expanding-cards.js` (148): activation,
      roving arrows/Home/End, `role="button"`/`aria-pressed` +
      MutationObserver sync, `manual` opt-out.
- [ ] 2.6 `tests/composables/use-expanding-cards.spec.ts`: single active
      card, keyboard traversal, aria-pressed sync, manual skip, observer
      disconnect on unmount.

## 3. Form + reveal rewrites

- [ ] 3.1 `useValidate` ← `validate.js` (196): ten rules, modes +
      per-field override, message catalog + `data-vd-msg-*` + `{0}`,
      `.vd-validate-error` ARIA plumbing, submit gate + `validate:submit`,
      match-by-id extension; controller `{ validate, addRule }`.
- [ ] 3.2 `tests/composables/use-validate.spec.ts`: blur/input/submit
      modes, error element lifecycle, param substitution, first-invalid
      focus, match by id and by name, addRule.
- [ ] 3.3 `useTimeline` ← `timeline.js` (255): stagger vars, IO reveal
      with unobserve, reduced-motion + no-IO fallbacks, playback mode
      (step/play/pause, button disabled/aria state, 800 ms auto-advance,
      auto-pause at end).
- [ ] 3.4 `tests/composables/use-timeline.spec.ts`: stagger delays, reveal
      on intersection (mock IO), reduced-motion instant reveal, playback
      stepping + button states, timer cleanup on unmount.

## 4. Overlay rewrites

- [ ] 4.1 `usePopover` ← merge `bubble.js` (211) + `popover.js` (294):
      both markup contracts per the spec; sanitized HTML via existing
      `utils/sanitizeHtml`; shared position/clamp/flip helpers; distinct
      `bubble:*` / `popover:*` events; capture-phase outside click;
      Escape; per-instance document/window listener cleanup.
- [ ] 4.2 `tests/composables/use-popover.spec.ts`: bubble build + toggle +
      sanitize, panel trigger modes (click/hover/focus), placement default
      + flip, escape/outside close, generated-DOM removal on unmount.
- [ ] 4.3 `useSpotlight` ← `spotlight.js` (325): JSON parse/normalize,
      overlay+tooltip construction and ARIA, step rendering (Back/Skip/
      Next/Done, counter), target class + scroll + settle repositioning,
      stop semantics (focus restore, `spotlight:end` detail), single
      active tour, controller `{ start, stop, next, prev }`.
- [ ] 4.4 `tests/composables/use-spotlight.spec.ts`: trigger start, step
      navigation, done vs escape end details, invalid JSON inert, DOM
      cleanup on stop and on unmount.
- [ ] 4.5 `useImageBox` ← `image-box.js` (417): refcounted shared
      backdrop, source resolution chain, caption, scroll lock +
      `--vd-scrollbar-width`, dismissal trio (click/Escape/scroll>50 px),
      focus restore, `is-broken`, non-interactive trigger keyboard
      access, `imageBox:open/close`.
- [ ] 4.6 `tests/composables/use-image-box.spec.ts`: open via full-src,
      caption fallback, scroll-lock class, each dismissal path, focus
      restore, backdrop removed when last consumer unmounts.

## 5. Composite rewrites

- [ ] 5.1 `useTabs` ← `tabs.js` (317): full ARIA wiring, three-way pane
      resolution, roving tabindex, orientation-aware arrows + Home/End +
      Enter/Space, disabled skip, first-tab auto-activation, `tab:change`;
      delegation-friendly wiring per design decision 5.
- [ ] 5.2 `tests/composables/use-tabs.spec.ts`: mount wiring, click +
      keyboard activation with wrap, vertical mode, disabled skip, event
      detail shape.
- [ ] 5.3 `useDropdown` ← `dropdown.js` (369): ARIA contract, is-open
      lifecycle with focus management, outside click, full keyboard set +
      500 ms typeahead, selection semantics + `dropdown:select`,
      auto-placement classes honoring directional wrappers; controller
      `{ open, close }`.
- [ ] 5.4 `tests/composables/use-dropdown.spec.ts`: open/close/ARIA/focus,
      selection value + label update, typeahead, Home/End/Escape,
      placement class toggling, sibling-instance isolation.
- [ ] 5.5 `useDraggable` ← `draggable.js` (819): items (HTML5 drag
      lifecycle, classes, events), containers (listbox + midpoint
      reorder), drop zones (`is-drag-over`, `draggable:drop` payload),
      touch fallback (threshold, feedback element, zone tracking),
      keyboard reorder + Escape cancel; refcounted feedback element;
      controller `{ makeDraggable, removeDraggable, refresh }`.
- [ ] 5.6 `tests/composables/use-draggable.spec.ts`: attribute/ARIA
      bootstrap, drag lifecycle classes + events, midpoint reorder
      (vertical + horizontal), zone handshake + drop payload, keyboard
      reorder both directions, teardown.
- [ ] 5.7 `useFlow` ← `flow.js` (264): goTo/loop math, fade vs transform,
      indicators (+ shim bridge), live region, keyboard, swipe threshold,
      autoplay pause/resume, `flow:change`; controller
      `{ goTo, next, prev }`.
- [ ] 5.8 `tests/composables/use-flow.spec.ts`: navigation + ARIA + event
      detail, indicator bridge, loop wrap vs clamp, swipe, autoplay
      pause-on-hover, timer cleanup.

## 6. VdMenu un-defer

- [ ] 6.1 Copy `VdMenu.vue` (donor 68 lines) from the old vue repo
      unmodified except the `useDropdown` import path.
- [ ] 6.2 `tests/components/vd-menu.spec.ts`: donor markup (toggle ARIA,
      menu role, divider, disabled), select emit value + prevented
      default, no emit on disabled, open/Escape via the rewritten
      dropdown.

## 7. Barrel + gates

- [ ] 7.1 `src/index.ts`: add the 12 composable exports (alphabetical into
      the composables block) and `VdMenu` into the components block.
- [ ] 7.2 `pnpm build` green via `mise exec node@24 -- pnpm build`
      (clean → build-tokens → build-css → vite → vue-tsc →
      check:classes — the class-coverage gate must stay green with
      `VdMenu` and all composable-toggled classes present in
      `dist/vd3.min.css`).
- [ ] 7.3 `pnpm test` green via `mise exec node@24 --` (all new specs +
      existing suite; `composable-behavior-specs` and
      `component-mount-specs` coverage requirements satisfied for every
      new export).
- [ ] 7.4 `pnpm lint`, `pnpm format:check`, `pnpm typecheck` green.

## 8. Docs + changelog + validation

- [ ] 8.1 CHANGELOG: unreleased `@vanduo-oss/vd3` entry — 12 restored
      composables + `VdMenu`, the per-instance-teardown and registry-
      access behavior notes (packages only, per policy).
- [ ] 8.2 Flag the new public surface for vd3-docs (docs sync happens in
      the docs repo's own change; composable pages + menu page).
- [ ] 8.3 `openspec validate vd3-rewrites --strict` green.
