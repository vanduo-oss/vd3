# Specification: Fibonacci Motion System

## Motion Tokens

### Durations (Fibonacci ms)
- `--vd-duration-0`: `0ms`
- `--vd-duration-55`: `55ms`
- `--vd-duration-89`: `89ms`
- `--vd-duration-144`: `144ms`
- `--vd-duration-233`: `233ms`
- `--vd-duration-377`: `377ms`
- `--vd-duration-610`: `610ms`
- `--vd-duration-987`: `987ms`

### Semantic Aliases
- `--vd-duration-instant`: `var(--vd-duration-89)` (89ms)
- `--vd-duration-fast`: `var(--vd-duration-144)` (144ms)
- `--vd-duration-base`: `var(--vd-duration-233)` (233ms)
- `--vd-duration-slow`: `var(--vd-duration-377)` (377ms)
- `--vd-duration-slower`: `var(--vd-duration-610)` (610ms)
- `--vd-duration-slowest`: `var(--vd-duration-987)` (987ms)

### Golden Easing Curves
- `--vd-ease-out`: `cubic-bezier(0.236, 1, 0.382, 1)`
- `--vd-ease-in`: `cubic-bezier(0.618, 0, 0.764, 0)`
- `--vd-ease-in-out`: `cubic-bezier(0.618, 0, 0.382, 1)`
- `--vd-ease-linear`: `cubic-bezier(0, 0, 1, 1)`

## Runtime Controls

Attribute: `html[data-motion="auto|full|reduce|off"]`
- `auto`: respects `prefers-reduced-motion`
- `full`: enables motion regardless of OS settings
- `reduce`: eliminates positional shifts and dimension interpolations; retains short 89ms crossfade
- `off`: zeroes all durations (0ms)

