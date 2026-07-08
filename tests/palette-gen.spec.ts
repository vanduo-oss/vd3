/**
 * Fibonacci palette generator contract — ported from the old core repo's
 * palette-gen.test.mjs. Asserts the committed generated source is
 * reproducible, in-gamut, and shaped (monotonic lightness, recognizable
 * contrast) the way the docs/UI rely on.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const fibPath = resolve(root, "tokens/primitive/color.fib.tokens.json");
const ocPath = resolve(root, "tokens/primitive/color.tokens.json");

type Leaf = { $type: string; $value: string };
type Family = Record<string, Leaf>;

const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));

const families = (tree: Record<string, unknown>): Record<string, Family> =>
  Object.fromEntries(
    Object.entries(tree).filter(([k]) => !k.startsWith("$")),
  ) as Record<string, Family>;

// sRGB hex -> relative luminance (WCAG).
const luminance = (hex: string): number => {
  const n = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = ch.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("Fibonacci palette generator", () => {
  it("output is reproducible (committed === regenerated)", () => {
    const before = readFileSync(fibPath, "utf8");
    execSync(`"${process.execPath}" scripts/generate-fib-palette.mjs`, {
      cwd: root,
      stdio: "pipe",
    });
    const after = readFileSync(fibPath, "utf8");
    expect(after, "color.fib.tokens.json changed on regeneration").toBe(before);
  });

  it("every Open Color family has a Fibonacci counterpart + golden track", () => {
    const fib = families(readJson(fibPath));
    const oc = families(readJson(ocPath));
    for (const family of Object.keys(oc)) {
      expect(fib[family], `missing fib family: ${family}`).toBeTruthy();
      for (let i = 0; i <= 9; i++) {
        expect(
          fib[family][String(i)],
          `fib ${family} missing step ${i}`,
        ).toBeTruthy();
      }
    }
    expect(fib.golden, "missing golden accent track").toBeTruthy();
    expect(
      Object.keys(fib.golden).length,
      "golden track too short",
    ).toBeGreaterThanOrEqual(5);
  });

  it("every shade is a valid 6-digit sRGB hex", () => {
    const fib = families(readJson(fibPath));
    for (const [family, steps] of Object.entries(fib)) {
      for (const [step, leaf] of Object.entries(steps)) {
        expect(leaf.$value, `${family}.${step} = ${leaf.$value}`).toMatch(
          /^#[0-9a-f]{6}$/,
        );
      }
    }
  });

  it("shade lightness decreases monotonically (0 lightest -> 9 darkest)", () => {
    const fib = families(readJson(fibPath));
    for (const [family, steps] of Object.entries(fib)) {
      if (family === "golden") continue; // accent track, not a 0..9 scale
      const lums: number[] = [];
      for (let i = 0; i <= 9; i++)
        lums.push(luminance(steps[String(i)].$value));
      for (let i = 1; i < lums.length; i++) {
        expect(
          lums[i] < lums[i - 1],
          `${family}: step ${i} not darker than ${i - 1} (${lums[i]} >= ${lums[i - 1]})`,
        ).toBe(true);
      }
    }
  });

  it("contrast is usable for text on light/dark backgrounds", () => {
    const fib = families(readJson(fibPath));
    for (const family of [
      "primary",
      "secondary",
      "red",
      "green",
      "blue",
      "info",
    ]) {
      const dark = fib[family]["9"].$value;
      const light = fib[family]["0"].$value;
      expect(
        contrast(dark, "#ffffff"),
        `${family}-9 vs white only ${contrast(dark, "#ffffff").toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(light, "#000000"),
        `${family}-0 vs black only ${contrast(light, "#000000").toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
