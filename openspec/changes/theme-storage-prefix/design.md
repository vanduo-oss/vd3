## Context

Theme preferences persist under six fixed `vanduo-*` keys. Same-origin apps
share those keys and overwrite each other. Consumers need an opt-in namespace.

## Decisions

1. **Prefix, not full key map.** Keep the six suffixes
   (`palette`, `primary-color`, `neutral-color`, `radius`, `font-preference`,
   `theme-preference`) and prepend a configurable prefix. Default prefix is
   `"vanduo-"`.
2. **Bootstrap-only.** `setStoragePrefix` MUST run before the first
   `loadPreference` / `useThemePreference` call. The plugin applies
   `storagePrefix` synchronously on install, before `themeDefaults`.
3. **No migration.** Changing prefix does not copy values from the old
   namespace; consumers that need migration keep their existing remappers.
4. **Back-compat.** Omitting the option leaves keys exactly as today.

## Risks

- Calling `setStoragePrefix` after the singleton has hydrated leaves in-memory
  state bound to the previous keys until reload — documented as unsupported.
- Empty or malformed prefixes could collide with unrelated keys; we accept any
  non-empty string and document the convention (`app-name-`).
