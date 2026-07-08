/**
 * Generated color partials — new to vd3 (not a core port): after a token
 * build, the two generated partials exist under css/core/generated/ where
 * css/vd3.css imports them, and they carry the [data-palette] runtime
 * switch blocks the theming contract depends on.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const generatedDir = resolve(root, "css", "core", "generated");

const PARTIALS = ["colors-fib-base.css", "colors-palette.css"];

describe("generated color partials", () => {
  beforeAll(() => {
    execSync(`"${process.execPath}" scripts/build-tokens.mjs`, {
      cwd: root,
      stdio: "pipe",
    });
  });

  it("exist after a token build, non-empty", () => {
    for (const f of PARTIALS) {
      const p = resolve(generatedDir, f);
      expect(existsSync(p), `${f} missing`).toBe(true);
      expect(readFileSync(p, "utf8").length, `${f} empty`).toBeGreaterThan(0);
    }
  });

  it("are imported by the css entry at their generated/ paths", () => {
    const entry = readFileSync(resolve(root, "css/vd3.css"), "utf8");
    expect(entry).toContain(
      "@import url('core/generated/colors-fib-base.css');",
    );
    expect(entry).toContain(
      "@import url('core/generated/colors-palette.css');",
    );
  });

  it("contain the [data-palette] switch blocks", () => {
    const palette = readFileSync(
      resolve(generatedDir, "colors-palette.css"),
      "utf8",
    );
    expect(palette).toContain('[data-palette="fibonacci"]');
    expect(palette).toContain('[data-palette="open-color"]');
    const fibBase = readFileSync(
      resolve(generatedDir, "colors-fib-base.css"),
      "utf8",
    );
    // The raw scales both palettes switch between live in the base partial.
    expect(fibBase).toMatch(/--vd-oc-[a-z]+-\d:/);
    expect(fibBase).toMatch(/--vd-fib-[a-z]+-\d:/);
  });
});
