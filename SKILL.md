---
name: vanduo-vd3
description: Build Vue 3 interfaces with @vanduo-oss/vd3 components, composables, and theme tokens. Use for consumer integration and package API questions.
---

# Vanduo Vue 3

Install `@vanduo-oss/vd3` alongside Vue. Import components by name. Use `app.use(VanduoVue, options)` to set theme defaults or storage keys.
The plugin does not register components; keep named imports in each component.

Import **one** base stylesheet once in the app entry:

```ts
import '@vanduo-oss/vd3/css';
```

Use `@vanduo-oss/vd3/css/core` instead when bundled icon fonts are unnecessary.
It includes component styles; it is not tokens-only. Import resolved token data
from `@vanduo-oss/vd3/tokens.json` when tooling needs JSON.

## Tasks

- [Modal and toast](recipes/modal-toast.vue): complete component with local
  `v-model:open` state, a Save action, and a toast container. Mount one toast
  container per app. Verify Save closes the dialog, announces success, and
  returns focus to the trigger.
- [Tooltip](recipes/tooltip.vue): one focusable child, tooltip text, placement,
  and a click event. Verify pointer hover and keyboard focus show the tooltip;
  Escape closes it without moving focus.

Copy the relevant recipe into the app; preserve the app's existing CSS and
initialization choices. Compose existing components before adding custom DOM
behavior. Confirm props/events in [public declarations](dist/index.d.ts) and
the linked component declarations; do not infer a component API from a CSS demo.

## State and server rendering

Theme preferences and the toast queue currently live at module scope. Multiple
Vue apps using the same module instance share them. A storage prefix changes
browser keys, not state ownership. Do not enqueue personalized toasts or change
per-user theme state during server rendering. Static SSR shells are supported;
personalized multi-app/request isolation requires an app-owned state boundary.

Keep browser behavior in mounted components. Use sanitized text for untrusted
content; enabling `allowStyle` in `sanitizeHtml` is for trusted input only.

Run the consumer build and test the actual interaction with the chosen light and
dark theme. Package declarations establish the API; a passing build does not
establish contrast, focus behavior, or screen-reader usability.
