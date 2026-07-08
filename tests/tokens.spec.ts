/**
 * DTCG source integrity — ported from the old core repo's tokens.test.mjs.
 * The token files in tokens/ are the hand-edited source of truth, so guard
 * their shape directly (independent of the build output).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const tokensDir = resolve(here, "..", "tokens");
const read = (rel: string) =>
  JSON.parse(readFileSync(resolve(tokensDir, rel), "utf8"));

const DTCG_FILES = [
  "primitive/color.tokens.json",
  "primitive/color.fib.tokens.json",
  "primitive/scale.tokens.json",
  "semantic/color.tokens.json",
];

interface Leaf {
  name: string;
  node: { $type?: unknown; $value?: unknown };
}

/** Collect { name, node } for every DTCG leaf ($value-bearing node). */
const leaves = (
  node: Record<string, unknown>,
  path: string[] = [],
  out: Leaf[] = [],
): Leaf[] => {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    if (child && typeof child === "object" && "$value" in child) {
      out.push({ name: [...path, key].join("."), node: child });
    } else if (child && typeof child === "object") {
      leaves(child as Record<string, unknown>, [...path, key], out);
    }
  }
  return out;
};

const isRef = (v: unknown): v is string =>
  typeof v === "string" && /^\{[^}]+\}$/.test(v);
const refToVar = (ref: string) =>
  "--vd-" + ref.slice(1, -1).replace(/\./g, "-");

describe("DTCG token sources", () => {
  it("parses every file and every leaf is typed", () => {
    for (const file of DTCG_FILES) {
      const ls = leaves(read(file));
      expect(ls.length, `${file} has no token leaves`).toBeGreaterThan(0);
      for (const { name, node } of ls) {
        expect(
          typeof node.$type === "string" && node.$type.length > 0,
          `${file}:${name} missing $type`,
        ).toBe(true);
        expect(
          node.$value !== undefined && node.$value !== "",
          `${file}:${name} missing $value`,
        ).toBe(true);
      }
    }
  });

  it("every token reference points at an existing token", () => {
    const all = new Map<string, unknown>();
    for (const file of DTCG_FILES) {
      for (const { name, node } of leaves(read(file))) {
        all.set("--vd-" + name.replace(/\./g, "-"), node.$value);
      }
    }
    const dangling: string[] = [];
    for (const [name, value] of all) {
      if (isRef(value) && !all.has(refToVar(value))) {
        dangling.push(`${name} -> ${value}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it("customizer options have the required shape", () => {
    const o = read("customizer/options.json");
    for (const key of [
      "palettes",
      "primary",
      "neutral",
      "radius",
      "fonts",
      "themeModes",
      "defaults",
    ]) {
      expect(o, `options.json missing "${key}"`).toHaveProperty(key);
    }
    expect(Array.isArray(o.palettes) && o.palettes.length >= 2).toBe(true);
    const paletteKeys = o.palettes.map((p: { key: string }) => p.key);
    expect(paletteKeys).toContain("fibonacci");
    expect(paletteKeys).toContain("open-color");
    for (const p of o.palettes) {
      expect(
        Boolean(p.key && p.name && p.description),
        `palette missing fields: ${JSON.stringify(p)}`,
      ).toBe(true);
    }
    expect(Array.isArray(o.primary) && o.primary.length > 0).toBe(true);
    for (const c of [...o.primary, ...o.neutral]) {
      expect(
        Boolean(c.key && c.name),
        `swatch missing key/name: ${JSON.stringify(c)}`,
      ).toBe(true);
      expect(c.color, `swatch has bad color: ${JSON.stringify(c)}`).toMatch(
        /^#[0-9a-f]{3,8}$/i,
      );
    }
    for (const f of o.fonts) {
      expect(
        Boolean(f.key && f.name),
        `font missing key/name: ${JSON.stringify(f)}`,
      ).toBe(true);
    }
  });

  it("every customizer default references a real option", () => {
    const o = read("customizer/options.json");
    const d = o.defaults;
    const hasKey = (arr: Array<{ key: string }>, k: string) =>
      arr.some((x) => x.key === k);
    expect(
      hasKey(o.palettes, d.palette),
      `defaults.palette "${d.palette}"`,
    ).toBe(true);
    expect(
      hasKey(o.primary, d.primaryLight),
      `defaults.primaryLight "${d.primaryLight}"`,
    ).toBe(true);
    expect(
      hasKey(o.primary, d.primaryDark),
      `defaults.primaryDark "${d.primaryDark}"`,
    ).toBe(true);
    expect(
      hasKey(o.neutral, d.neutral),
      `defaults.neutral "${d.neutral}"`,
    ).toBe(true);
    expect(o.radius, `defaults.radius "${d.radius}"`).toContain(d.radius);
    expect(hasKey(o.fonts, d.font), `defaults.font "${d.font}"`).toBe(true);
    expect(o.themeModes, `defaults.theme "${d.theme}"`).toContain(d.theme);
  });
});
