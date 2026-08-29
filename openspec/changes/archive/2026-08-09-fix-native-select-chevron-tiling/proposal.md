## Why

Native `<select>` (and related) chevrons are painted with `background-image`
SVG data URIs. State overrides (`:focus`, `:disabled`, `[data-theme="dark"]`)
re-set only `background-image`. When a consumer uses the `background`
shorthand, CSS resets `background-repeat` / position / size to initials; dark
`:focus` then re-applies the image alone and the chevron **tiles** across the
closed trigger. Caught in Labs AI Chat model dropdown and documented as a
workaround in vd3-cbun flowchart CSS.

## What Changes

- Re-declare `background-repeat: no-repeat`, `background-position`, and
  `background-size` on every select / custom-select caret rule that today sets
  only `background-image`.
- Add a CSS regression test so image-only overrides cannot regress.
- Patch bump `1.2.1 → 1.2.2`.
- Brief consumer note in vd3-docs Forms (prefer `background-color` / longhands
  over `background` when tinting native selects).
- `pnpm update` for dependencies and devDependencies on the release branch.

## Capabilities

### New Capabilities

- _None._

### Modified Capabilities

- `css-distribution`: adds a `native-select-chevron-longhands` requirement so
  every non-multi select caret state that sets a chevron `background-image`
  MUST also set `background-repeat: no-repeat` plus position/size matching the
  base rule.

## Semver

**Patch — bug fix.** `1.2.1 → 1.2.2`. No API, prop, class, or token change.
Chevron appearance is unchanged when consumers already used longhands /
`background-color`. Consumers that used `background` shorthand and saw tiling
on focus get a single caret again. Safe for any consumer on `^1.2.1`.

## Migration note (`@vanduo-oss/vue` → vd3)

None. Prefer `background-color` (or explicit background longhands) when
overriding native select fill — same guidance as other form controls that
combine fill with decorative `background-image`.

## Non-goals

- **No chevron mechanism change** — stay on `background-image` data URIs; no
  mask / `::after` refactor.
- **No wiring of unused `--vd-select-arrow-color*` tokens.**
- **No `prefers-color-scheme` dark arrow parity** (separate follow-up).
- **No Labs package bump / publish** in this change.
- **No new runtime dependency**, no Vue/JS component API change.

## Impact

- `css/components/forms.css` — caret state overrides re-declare longhands.
- Tests under `tests/` — authored/built CSS regression for focus/dark rules.
- Version bump: `package.json`, `VD3_VERSION`, README status, `CHANGELOG.md`.
- **Docs sync (downstream):** vd3-docs Forms page note on `background` vs
  `background-color`.
- Deps: lockfile refresh via `pnpm update`.
