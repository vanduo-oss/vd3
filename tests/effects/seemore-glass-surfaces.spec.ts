/**
 * Seemore Glass + Surfaces — generated CSS contract.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Seemore Glass + Surfaces CSS contract", () => {
  let css = "";
  let glassSource = "";

  beforeAll(() => {
    execSync(`"${process.execPath}" scripts/build-tokens.mjs`, {
      cwd: root,
      stdio: "pipe",
    });
    execSync(`"${process.execPath}" scripts/build-css.mjs`, {
      cwd: root,
      stdio: "pipe",
    });
    css = readFileSync(resolve(root, "dist/vd3.css"), "utf8");
    glassSource = readFileSync(resolve(root, "css/effects/glass.css"), "utf8");
  });

  it("ships Fibonacci glass step selectors", () => {
    for (const step of [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]) {
      expect(css).toContain(`.vd-glass-${step}`);
    }
  });

  it("defaults base glass blur to step 5 (8px)", () => {
    const tokens = readFileSync(resolve(root, "css/core/tokens.css"), "utf8");
    expect(tokens).toMatch(/--vd-glass-blur:\s*8px/);
    expect(css).toMatch(/--vd-glass-blur:\s*8px/);
  });

  it("does not transition backdrop-filter on scroll glass", () => {
    const scrollBlock = glassSource.match(
      /\[data-glass-scroll\]\s*\{[^}]+\}/,
    )?.[0];
    expect(scrollBlock).toBeTruthy();
    expect(scrollBlock).not.toMatch(/backdrop-filter/);
  });

  it("ships decorative surface variants and intensity modifiers", () => {
    expect(css).toContain(".vd-surface");
    for (const variant of [
      "mesh",
      "stripe",
      "noise",
      "aurora",
      "dots",
      "grid",
    ]) {
      expect(css).toContain(`.vd-surface-${variant}`);
    }
    for (const intensity of [3, 5, 8]) {
      expect(css).toContain(`.vd-surface-${intensity}`);
    }
  });

  it("imports surfaces after glass in Layer 5", () => {
    const entry = readFileSync(resolve(root, "css/vd3.css"), "utf8");
    const glassIdx = entry.indexOf("effects/glass.css");
    const surfacesIdx = entry.indexOf("effects/surfaces.css");
    expect(glassIdx).toBeGreaterThan(-1);
    expect(surfacesIdx).toBeGreaterThan(glassIdx);
  });

  it("clamps navbar scrolled blur to step-21 GPU soft-cap", () => {
    const navbar = readFileSync(
      resolve(root, "css/components/navbar.css"),
      "utf8",
    );
    expect(navbar).toMatch(
      /\.vd-navbar-glass\.vd-navbar-scrolled\s*\{[^}]*--vd-glass-blur:\s*20px/,
    );
    expect(navbar).toMatch(
      /\.vd-navbar-glass\.vd-navbar-scrolled\s*\{[^}]*--vd-glass-bg-opacity:\s*0\.42/,
    );
    expect(navbar).not.toMatch(/--vd-glass-blur:\s*80px/);
  });

  it("uses near-transparent white wash for dark navbar glass (no grey fog)", () => {
    const navbar = readFileSync(
      resolve(root, "css/components/navbar.css"),
      "utf8",
    );
    expect(navbar).toMatch(
      /\[data-theme="dark"\]\s*\.vd-navbar-glass\.vd-navbar-scrolled\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\)/,
    );
    expect(navbar).not.toMatch(
      /\.vd-navbar-glass\.vd-navbar-scrolled[^}]*--vd-glass-bg-dark/,
    );
  });

  it("escalates marketing steps past 21 with modest blur", () => {
    expect(glassSource).toMatch(
      /\.vd-glass-34\s*\{[^}]*--vd-glass-blur:\s*22px/,
    );
    expect(glassSource).toMatch(
      /\.vd-glass-55\s*\{[^}]*--vd-glass-blur:\s*24px/,
    );
    expect(glassSource).toMatch(
      /\.vd-glass-89\s*\{[^}]*--vd-glass-blur:\s*26px/,
    );
    expect(glassSource).toMatch(
      /\.vd-glass-89\s*\{[^}]*--vd-glass-bg-opacity:\s*0\.66/,
    );
  });

  it("ships floating navbar inset modifier", () => {
    const navbar = readFileSync(
      resolve(root, "css/components/navbar.css"),
      "utf8",
    );
    expect(navbar).toContain(".vd-navbar-float");
    expect(navbar).toContain("--vd-navbar-float-inset");
    expect(navbar).toContain("--vd-navbar-float-radius");
    expect(navbar).toContain("--vd-navbar-glass-specular");
    expect(navbar).toMatch(/--vd-navbar-glass-specular:\s*0\.58/);
    expect(navbar).toMatch(
      /\.vd-navbar-float\s*\{[^}]*padding-top:\s*0\.65rem/,
    );
    expect(navbar).toMatch(/codepen\.io\/samarkandiy\/pen\/MYwQwZZ/);
  });

  it("keeps unprefixed backdrop-filter in dist (Chromium needs it)", () => {
    // LightningCSS otherwise emits only -webkit-backdrop-filter, which
    // Chromium ignores — glass then paints a flat grey wash in dark mode.
    expect(css).toMatch(/\.vd-navbar-glass[^{]*\{[^}]*backdrop-filter:\s*blur/);
    const webkitOnly = (
      css.match(/-webkit-backdrop-filter\s*:\s*[^;}]+/g) || []
    ).length;
    const unprefixed = (
      css.match(/(?<!-webkit-)backdrop-filter\s*:\s*[^;}]+/g) || []
    ).length;
    expect(unprefixed).toBeGreaterThan(0);
    expect(unprefixed).toBeGreaterThanOrEqual(webkitOnly);
  });
});
