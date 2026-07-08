/**
 * Token-build output contract — ported from the old core repo's
 * build.test.mjs. Verifies scripts/build-tokens.mjs is deterministic and
 * emits a well-formed, fully-resolved, correctly-namespaced artifact set
 * (generated CSS partials + typed token-data module + flat tokens.json).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const ARTIFACTS = [
  "dist/tokens.js",
  "dist/tokens.d.ts",
  "dist/tokens.json",
  "css/core/generated/colors-fib-base.css",
  "css/core/generated/colors-palette.css",
];

const build = () =>
  execSync(`"${process.execPath}" scripts/build-tokens.mjs`, {
    cwd: root,
    stdio: "pipe",
  });
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");
const rootBody = (css: string): string => {
  const match = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  expect(match, "expected a :root block").not.toBeNull();
  return (match as RegExpMatchArray)[1];
};
/** Both generated partials concatenated (palette var() refs resolve across them). */
const generatedPair = () =>
  read("css/core/generated/colors-fib-base.css") +
  "\n" +
  read("css/core/generated/colors-palette.css");

describe("scripts/build-tokens.mjs output contract", () => {
  beforeAll(() => {
    build(); // ensure artifacts exist before any assertions
  });

  it("emits all five artifacts, non-empty", () => {
    for (const f of ARTIFACTS) {
      expect(read(f).length, `${f} is empty`).toBeGreaterThan(0);
    }
  });

  it("build is deterministic (byte-identical across runs)", () => {
    const first = ARTIFACTS.map(read);
    build();
    const second = ARTIFACTS.map(read);
    ARTIFACTS.forEach((f, i) => {
      expect(second[i], `${f} changed between identical builds`).toBe(first[i]);
    });
  });

  it("generated CSS exposes only --vd-* custom properties", () => {
    const css = generatedPair();
    const names = [...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map(
      (m) => m[1],
    );
    expect(names.length, "expected custom properties").toBeGreaterThan(0);
    expect(names.filter((n) => !n.startsWith("--vd-"))).toEqual([]);
  });

  it("every var() reference resolves to a defined token", () => {
    const css = generatedPair();
    const defined = new Set(
      [...css.matchAll(/(--vd-[a-z0-9-]+)\s*:/gi)].map((m) => m[1]),
    );
    const referenced = [...css.matchAll(/var\((--vd-[a-z0-9-]+)\)/gi)].map(
      (m) => m[1],
    );
    const dangling = [...new Set(referenced)].filter((r) => !defined.has(r));
    expect(
      dangling,
      `dangling var() references: ${dangling.join(", ")}`,
    ).toEqual([]);
  });

  it("tokens.json holds fully-resolved literals (no unresolved {refs})", () => {
    const json = JSON.parse(read("dist/tokens.json"));
    expect(json.cssVariables && typeof json.cssVariables === "object").toBe(
      true,
    );
    const unresolved = Object.entries(json.cssVariables)
      .filter(([, v]) => /^\{[^}]+\}$/.test(String(v)))
      .map(([k]) => k);
    expect(unresolved, "references should resolve to literal values").toEqual(
      [],
    );
    expect(json.customizer, "customizer metadata present").toBeTruthy();
  });

  it("tokens.js exposes the documented public API", async () => {
    const url = pathToFileURL(resolve(root, "dist/tokens.js")).href;
    const mod = (await import(/* @vite-ignore */ url)) as Record<
      string,
      unknown
    >;
    for (const name of [
      "PALETTE_OPTIONS",
      "PRIMARY_COLORS",
      "NEUTRAL_COLORS",
      "RADIUS_OPTIONS",
      "FONT_OPTIONS",
      "THEME_MODES",
      "DEFAULTS",
      "tokens",
    ]) {
      expect(name in mod, `missing export: ${name}`).toBe(true);
    }
    const primary = mod.PRIMARY_COLORS as Array<{
      key: string;
      name: string;
      color: string;
    }>;
    expect(Array.isArray(primary) && primary.length > 0).toBe(true);
    for (const c of primary) {
      expect(
        Boolean(c.key && c.name && c.color),
        `malformed ColorDef: ${JSON.stringify(c)}`,
      ).toBe(true);
    }
    const palettes = mod.PALETTE_OPTIONS as Array<{ key: string }>;
    expect(Array.isArray(palettes) && palettes.length >= 2).toBe(true);
    expect(palettes.some((p) => p.key === "fibonacci")).toBe(true);
    expect(palettes.some((p) => p.key === "open-color")).toBe(true);
    const defaults = mod.DEFAULTS as Record<string, string>;
    for (const k of [
      "PALETTE",
      "PRIMARY_LIGHT",
      "PRIMARY_DARK",
      "NEUTRAL",
      "RADIUS",
      "FONT",
      "THEME",
    ]) {
      expect(k in defaults, `DEFAULTS missing ${k}`).toBe(true);
    }
    expect(defaults.PALETTE, "default palette should be open-color").toBe(
      "open-color",
    );
    const tokens = mod.tokens as Record<string, string>;
    expect(
      tokens && typeof tokens === "object" && Object.keys(tokens).length > 0,
      "tokens map should be a non-empty object",
    ).toBe(true);
  });

  it("dual palettes: namespaced scales, OC default, data-palette switch", () => {
    const fibBase = read("css/core/generated/colors-fib-base.css");
    const palette = read("css/core/generated/colors-palette.css");

    // Namespaced raw scales present for both palettes (literal hex).
    const baseBody = rootBody(fibBase);
    expect(baseBody).toMatch(/--vd-oc-primary-5:\s*#[0-9a-f]{6}/i);
    expect(baseBody).toMatch(/--vd-fib-primary-5:\s*#[0-9a-f]{6}/i);

    // Golden accent track is Fibonacci-only.
    expect(baseBody).toMatch(/--vd-fib-golden-1:\s*#[0-9a-f]{6}/i);
    expect(baseBody).not.toMatch(/--vd-oc-golden-1:/);

    // Active scale defaults to Open Color; golden stays bound to fib.
    const activeBody = rootBody(palette);
    expect(activeBody).toMatch(/--vd-primary-5:\s*var\(--vd-oc-primary-5\)/);
    expect(activeBody).toMatch(/--vd-golden-1:\s*var\(--vd-fib-golden-1\)/);

    // Switch blocks exist and rebind the active scale.
    const ocBlock = palette.match(
      /\[data-palette="open-color"\]\s*\{([\s\S]*?)\n\}/,
    );
    expect(ocBlock, "missing [data-palette=open-color] block").not.toBeNull();
    expect((ocBlock as RegExpMatchArray)[1]).toMatch(
      /--vd-primary-5:\s*var\(--vd-oc-primary-5\)/,
    );
    const fibBlock = palette.match(
      /\[data-palette="fibonacci"\]\s*\{([\s\S]*?)\n\}/,
    );
    expect(fibBlock, "missing [data-palette=fibonacci] block").not.toBeNull();
    expect((fibBlock as RegExpMatchArray)[1]).toMatch(
      /--vd-primary-5:\s*var\(--vd-fib-primary-5\)/,
    );
  });

  it("tokens map resolves the active palette to Open Color literals", () => {
    const json = JSON.parse(read("dist/tokens.json"));
    const v = json.cssVariables as Record<string, string>;
    expect(v["--vd-primary-5"], "active should equal oc literal").toBe(
      v["--vd-oc-primary-5"],
    );
    expect(v["--vd-fib-primary-5"], "palettes should differ").not.toBe(
      v["--vd-oc-primary-5"],
    );
    expect(v["--vd-color-primary"], "semantic resolves through active").toBe(
      v["--vd-oc-primary-5"],
    );
  });
});
