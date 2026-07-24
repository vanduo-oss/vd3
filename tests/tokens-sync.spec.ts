/**
 * Token-value sync gate.
 *
 * The shipped `--vd-*` custom properties exist in two independent copies: the
 * hand-authored `css/core/tokens.css` (the values that actually ship) and the
 * DTCG-derived token data built from `tokens/*.json` into
 * `src/theme/generated/tokens.data.ts` (mirrored 1:1 in `dist/tokens.json`).
 * Nothing else forces them to agree, so a `--vd-*` value could silently drift
 * between the DTCG source and the shipped CSS. This gate closes that gap.
 *
 * Method: parse the `:root` default layer of the shipped CSS — `tokens.css`
 * plus the generated `colors-fib-base` / `colors-palette` partials — resolve
 * every `var()` chain to a literal, and compare each overlapping property
 * against the resolved literal the DTCG build emits for it. Tokens that live
 * only in the CSS layer (glass / transition / z-index / font-family / derived
 * color helpers / extra semantic aliases — none of which have a DTCG primitive
 * source) are tolerated, but must match a small, documented CSS-only allowlist
 * so a NEW, unexplained CSS-only property is still caught.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { tokens as dtcgTokens } from "../src/theme/generated/tokens.data";

const cssDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "css",
  "core",
);

/** `--vd-* : value;` declarations from a file's first `:root { … }` block. */
const rootDecls = (rel: string): Record<string, string> => {
  const css = readFileSync(resolve(cssDir, rel), "utf8");
  const body = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const out: Record<string, string> = {};
  for (const d of body.matchAll(/(--vd-[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[d[1]] = d[2].trim();
  }
  return out;
};

// Full resolution environment: the generated partials define the raw palette
// scales (--vd-oc-* / --vd-fib-*) and the active layer; tokens.css the semantic
// layer. All three are needed to resolve a var() chain down to a literal.
const env: Record<string, string> = {
  ...rootDecls("generated/colors-fib-base.css"),
  ...rootDecls("generated/colors-palette.css"),
  ...rootDecls("tokens.css"),
};

const VAR_RE = /var\(\s*(--vd-[a-z0-9-]+)\s*\)/i;
/** Follow `var(--vd-x)` references through `env` until only literals remain. */
const resolveLiteral = (value: string): string => {
  let v = value;
  for (let guard = 0; VAR_RE.test(v) && guard < 50; guard++) {
    v = v.replace(VAR_RE, (_m, name: string) =>
      name in env ? env[name] : `«undef:${name}»`,
    );
  }
  return v.trim();
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Tokens that legitimately ship only from css/core/tokens.css: they have no
// DTCG primitive source in tokens/*.json, so they never appear in the token
// data and are exempt from the drift comparison. Kept deliberately small — a
// new CSS-only --vd-* matching none of these fails the gate on purpose, forcing
// either a DTCG source or a reviewed allowlist entry.
const CSS_ONLY_ALLOW: ReadonlyArray<{ re: RegExp; why: string }> = [
  // Effect / utility families with no DTCG primitive.
  { re: /^--vd-glass-/, why: "glass surface effect tokens" },
  { re: /^--vd-transition-/, why: "motion timing tokens" },
  { re: /^--vd-z-/, why: "z-index layering scale" },
  { re: /^--vd-font-family-/, why: "font-stack strings" },
  { re: /^--vd-border-width$/, why: "border width literal" },
  // Color helpers composed at author time from a base color (rgba/color-mix);
  // the DTCG layer carries the base colors, not these derivations.
  { re: /^--vd-color-[a-z]+-rgb$/, why: "rgb triplet for rgba() composition" },
  {
    re: /^--vd-color-[a-z]+-alpha-\d+$/,
    why: "translucent color-mix/rgba variant",
  },
  // Semantic aliases / states layered on top of the DTCG semantic set.
  { re: /^--vd-color-danger(-|$)/, why: "danger alias of the error family" },
  { re: /^--vd-color-accent-(light|dark)$/, why: "accent light/dark aliases" },
  {
    re: /^--vd-color-(success|warning|error|info)-(hover|active)$/,
    why: "hover/active state variants",
  },
  { re: /^--vd-text-(tertiary|disabled|on-primary)$/, why: "extra text roles" },
];

const cssRoot = rootDecls("tokens.css");
const cssNames = Object.keys(cssRoot);
const overlap = cssNames.filter((n) => n in dtcgTokens);
const cssOnly = cssNames.filter((n) => !(n in dtcgTokens));

describe("token-value sync gate (tokens.css ⇄ DTCG token data)", () => {
  it("parses a meaningful --vd-* surface from both sources", () => {
    // Guards against a silently-green gate if the CSS parse or the token data
    // import ever breaks.
    expect(cssNames.length, "no --vd-* parsed from tokens.css").toBeGreaterThan(
      100,
    );
    expect(
      Object.keys(dtcgTokens).length,
      "empty DTCG token data",
    ).toBeGreaterThan(100);
    expect(overlap.length, "no overlapping tokens to check").toBeGreaterThan(
      50,
    );
  });

  it("every overlapping token resolves to a literal", () => {
    // A `«undef:…»` marker means a var() reference had no definition in the
    // shipped CSS layer (e.g. a missing generated partial) — a real defect.
    const unresolved = overlap
      .map((n) => ({ n, r: resolveLiteral(cssRoot[n]) }))
      .filter(({ r }) => r.includes("«"))
      .map(({ n, r }) => `${n} -> ${r}`);
    expect(unresolved, "unresolvable var() chains").toEqual([]);
  });

  it("overlapping --vd-* values agree (no drift)", () => {
    const drift: string[] = [];
    for (const name of overlap) {
      const css = resolveLiteral(cssRoot[name]);
      const dtcg = String(dtcgTokens[name]);
      if (norm(css) !== norm(dtcg)) {
        drift.push(`${name}: css-resolved "${css}" != token-data "${dtcg}"`);
      }
    }
    expect(drift, "shipped CSS drifted from the DTCG token data").toEqual([]);
  });

  it("CSS-only tokens all match the documented allowlist", () => {
    const unexplained = cssOnly.filter(
      (n) => !CSS_ONLY_ALLOW.some(({ re }) => re.test(n)),
    );
    expect(
      unexplained,
      "css-only --vd-* with no DTCG source and no allowlist entry",
    ).toEqual([]);
  });
});
