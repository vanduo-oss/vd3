# Auth screens — design

## Headless by contract

vd3 is a UI kit. Screens are forms that emit typed payloads. No `fetch`, no
storage, no CSRF minting. The `#extra` slot exists so a parent can drop a
hidden CSRF input (or honeypot) inside the `<form>` without the kit knowing
the token.

## Primitive gaps, not a parallel form stack

A production login needs three things `VdInput` cannot do today:

1. **A control in the suffix.** Prefix/suffix are text nodes. Password reveal
   is a `<button type="button">` with `aria-pressed` and Phosphor `eye` /
   `eye-slash`. Slots (`#prefix` / `#suffix`) keep the text props as fallback
   so existing callers stay valid.
2. **A single boolean checkbox.** `VdCheckboxGroup` is a named set. Remember-me
   and terms are one boolean — `VdCheckbox` mirrors `VdSwitch`'s v-model and
   uses the existing `.vd-form-check` markup.
3. **OTP cells.** A single `VdInput maxlength=6` fails paste-to-fill and
   per-digit focus. `VdOtpInput` is a small widget, not a generic PIN kit.

`VdCard.glass` is the same additive-prop pattern as `VdModal.glass` /
`VdFab.glass`: CSS already ships `.vd-card-glass`.

## Composed screens

`VdAuthCard` is layout only: `VdCover` + `VdCenter` + `VdCard` (elevated and/or
glass) with slots `brand`, `title`, default, `alert`, `footer`. `VdLogin` /
`VdSignUp` / `VdForgotPassword` render *inside* it (or accept `framed={false}`
to skip the shell when the parent already has a card).

Credential fields never set `autocomplete="off"`. Defaults:

| Field | autocomplete | spellcheck | autocapitalize |
|---|---|---|---|
| Login identifier (email) | `email` | false | none |
| Login identifier (text) | `username` | — | none |
| Login password | `current-password` | false | none |
| Sign-up password | `new-password` | false | none |
| Confirm | `new-password` | false | none |
| Forgot / sign-up email | `email` | false | none |
| OTP first cell | `one-time-code` | false | none |

Sign-up confirm uses the same `match` message as `useValidate` ("Fields do not
match") implemented in the submit handler. Wiring the DOM-scan composable would
require `data-vd-rules` on the inner native input; VdInput does not expose that
attribute, and duplicating the scan layer inside a Vue form is worse than
checking `password === confirm` on submit.

## Social row

`providers: { id, label, icon? }[]` render ghost full-width buttons that emit
`social` with `id`. Icons are Phosphor names via `VdIcon`. No Google/GitHub
SDK, no branded colours (those fight the theme).

## Constraints honoured

Pure Vue, SSR-safe (no `window` at setup), zero new runtime deps, extend
existing CSS (`forms.css` + a small `auth.css` for the OTP grid and reveal
button). Class-coverage gate must resolve every new `vd-*` class.
