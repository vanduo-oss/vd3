## MODIFIED Requirements

### Requirement: use-tabs-rewrite

`useTabs` MUST reach full parity with `framework/js/components/tabs.js`
(317 lines) for tab containers in the root (superseding the old shim's
subset). Container and link resolution MUST accept the donor's **dual
selectors** as a non-breaking superset: `.vd-tabs, [data-tabs]` for the
container scan, the ownership check, and the `show()` container lookup, and
`.vd-tab-link, [data-tab]` for links (`linksOf` and the delegated
click/keydown `closest()` lookup); panes already resolve via
`.vd-tab-pane, [data-tab-pane]`. Class-based markup (`.vd-tabs` /
`.vd-tab-link`) MUST keep wiring exactly as before; attribute-flavored markup
(`[data-tabs]` / `[data-tab]`) now wires too. The behavior is otherwise
unchanged: tablist ARIA (`role="tablist"` on `.vd-tab-list`, `role="tab"` +
`aria-selected` + roving `tabindex` on the tab links, `role="tabpanel"` +
`aria-labelledby` on the panes with generated ids and `aria-controls`
back-links); pane resolution by `data-tab-pane`-attribute, then id, then
index; activation on click (and Enter/Space) skipping `disabled` tabs,
toggling `is-active` on tab and pane and dispatching `tab:change` with
`{ tab, pane, tabId }`; keyboard navigation with ArrowLeft/ArrowRight
(horizontal), ArrowUp/ArrowDown (`.vd-tabs-vertical`), Home/End — moving
focus AND activation with wrap-around, skipping disabled tabs; and
auto-activation of the first tab when none is `is-active` at mount.

#### Scenario: ARIA wiring at mount

- **GIVEN** a `.vd-tabs` container with three links and panes, none active
- **WHEN** the composable mounts
- **THEN** the first tab is activated (`is-active`,
  `aria-selected="true"`, `tabindex="0"`), the others have
  `tabindex="-1"`, and each pane has `role="tabpanel"` labelled by its tab

#### Scenario: attribute-flavored markup wires too

- **GIVEN** an attribute-only container marked `[data-tabs]` whose links are
  `[data-tab]` elements and whose panes are `[data-tab-pane]` elements, none
  active
- **WHEN** the composable mounts and a link is clicked (or arrow-navigated to)
- **THEN** the container wires identically to a `.vd-tabs` container — the
  first tab auto-activates with tablist/tab/tabpanel ARIA and roving
  tabindex, and clicking/arrowing a link activates it and dispatches
  `tab:change`

#### Scenario: arrow navigation wraps and activates

- **GIVEN** focus on the last enabled tab of a horizontal tablist
- **WHEN** ArrowRight is pressed
- **THEN** the first tab receives focus and activation, and `tab:change`
  fires with its `tabId`

#### Scenario: disabled tabs are skipped

- **GIVEN** a middle tab with the `disabled` class
- **WHEN** arrow navigation passes over it
- **THEN** it is never focused or activated

### Requirement: use-doc-search

The package root MUST export `useDocSearch`, porting the behavior core of
`framework/js/components/doc-search.js` (1016 lines) as a data-driven
composable (DOM-scan index building is intentionally dropped): it accepts
a document collection (`{ id, title, content?, category?, keywords?,
href? }[]`, statically or as a ref) plus the donor's behavior options
with the donor defaults — `minQueryLength: 2`, `maxResults: 10`,
`debounceMs: 150`, `highlightTag: "mark"` (validated against a safe-tag
whitelist), `keyboardShortcut: true` (Cmd/Ctrl+K focuses the bound
input). It SHALL expose reactive `query`, `results`, `isOpen`, and
`activeIndex`, and methods `search`, `open`, `close`, `navigate`,
`select`. Search MUST debounce input, ignore queries shorter than
`minQueryLength`, rank title matches above keyword matches above content
matches, cap at `maxResults`, and highlight matches with HTML-escaped
source text. Excerpting MUST align with the donor's `getExcerpt`: when a
query term appears in the body, the excerpt is a window around the first
content match. When no query term appears in the body — the metadata-only
case where a document matched on title / category / keyword only, **including
a document supplied with no `content` at all** — the excerpt SHALL be the
leading window of the body (`content.substring(0, EXCERPT_LENGTH)`) with a
trailing ellipsis appended only when the body exceeds `EXCERPT_LENGTH`, and
an empty (or whitespace-only) body SHALL yield an empty excerpt. The branch
MUST NOT emit the donor's degenerate bare `"..."` for an empty body, nor any
broken/stray-ellipsis fragment. Keyboard behavior on the bound input:
ArrowDown/ArrowUp move `activeIndex` (wrapping), Enter selects the active
result, Escape closes. The global shortcut listener MUST attach on mount and
detach on unmount.

#### Scenario: ranking and cap

- **GIVEN** documents where the query matches one title, one keyword set,
  and many bodies, with `maxResults: 3`
- **WHEN** the search settles
- **THEN** at most 3 results return, ordered title match first, keyword
  match second

#### Scenario: short queries do not search

- **GIVEN** `minQueryLength: 2`
- **WHEN** the query is a single character
- **THEN** `results` is empty and `isOpen` is false

#### Scenario: highlight is escaped

- **GIVEN** a document whose title contains `<b>` literally and a
  matching query
- **WHEN** the highlighted title is produced
- **THEN** the `<b>` renders as escaped text and only the configured
  highlight tag wraps the match

#### Scenario: metadata-only match yields a sensible excerpt

- **GIVEN** a document with a matching title and no `content`, matched by
  its title, and a second document matched by title whose short body does not
  contain the query term
- **WHEN** the search settles
- **THEN** the first result's excerpt is an empty string (no stray `"..."`)
  while the result still renders its title and category, and the second
  result's excerpt is its body text returned intact without a trailing
  ellipsis

#### Scenario: long non-matching body truncates with an ellipsis

- **GIVEN** a document matched by title whose body is longer than
  `EXCERPT_LENGTH` and contains no query term
- **WHEN** the search settles
- **THEN** the result's excerpt is the leading `EXCERPT_LENGTH` characters of
  the body followed by a trailing ellipsis

#### Scenario: keyboard shortcut focuses the input

- **GIVEN** a mounted instance with `keyboardShortcut: true`
- **WHEN** Cmd/Ctrl+K is pressed anywhere in the document
- **THEN** the bound input receives focus and the default is prevented

#### Scenario: unmount detaches global listeners

- **GIVEN** a mounted instance
- **WHEN** it unmounts
- **THEN** Cmd/Ctrl+K no longer focuses anything and no document
  listeners from the instance remain
