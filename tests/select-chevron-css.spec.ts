/**
 * Regression: native select chevron state overrides must re-declare
 * background-repeat / position / size. A consumer `background` shorthand
 * resets those longhands; image-only :focus then tiles the SVG caret.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const formsPath = resolve(root, "css/components/forms.css");

const CARET_LONGHANDS = [
  "background-repeat: no-repeat",
  "background-position: right 0.75rem center",
  "background-size: var(--vd-select-arrow-size) 12px",
] as const;

/** Pull a CSS rule body by matching a selector prefix that opens a block. */
function ruleBody(css: string, selectorNeedle: string): string {
  const idx = css.indexOf(selectorNeedle);
  expect(idx, `missing selector containing: ${selectorNeedle}`).toBeGreaterThan(
    -1,
  );
  const open = css.indexOf("{", idx);
  expect(open).toBeGreaterThan(idx);
  const close = css.indexOf("}", open);
  expect(close).toBeGreaterThan(open);
  return css.slice(open + 1, close);
}

function expectCaretLonghands(body: string, label: string) {
  expect(body, label).toContain("background-image:");
  expect(body, label).toContain("data:image/svg+xml");
  for (const prop of CARET_LONGHANDS) {
    expect(body, `${label} missing ${prop}`).toContain(prop);
  }
}

describe("native select chevron longhands (authored)", () => {
  const forms = readFileSync(formsPath, "utf8");

  it("focus rule re-declares caret longhands with the focus SVG", () => {
    const body = ruleBody(forms, "select.vd-input:focus,");
    expectCaretLonghands(body, "select:focus");
  });

  it("disabled rule re-declares caret longhands with the muted SVG", () => {
    const body = ruleBody(forms, "select.vd-input:disabled,");
    expectCaretLonghands(body, "select:disabled");
  });

  it("dark theme default, focus, and disabled caret rules re-declare longhands", () => {
    expectCaretLonghands(
      ruleBody(forms, '[data-theme="dark"] select.vd-input,'),
      "dark select",
    );
    expectCaretLonghands(
      ruleBody(forms, '[data-theme="dark"] select.vd-input:focus,'),
      "dark select:focus",
    );
    expectCaretLonghands(
      ruleBody(forms, '[data-theme="dark"] select.vd-input:disabled,'),
      "dark select:disabled",
    );
  });

  it("multi-select still clears the caret image", () => {
    const body = ruleBody(forms, "select[multiple].vd-input,");
    expect(body).toContain("background-image: none");
  });
});

describe("native select chevron longhands (built bundle)", () => {
  let minified = "";

  beforeAll(() => {
    execSync(`"${process.execPath}" scripts/build-tokens.mjs`, {
      cwd: root,
      stdio: "pipe",
    });
    execSync(`"${process.execPath}" scripts/build-css.mjs`, {
      cwd: root,
      stdio: "pipe",
    });
    minified = readFileSync(resolve(root, "dist/vd3.min.css"), "utf8");
  });

  it("keeps background-repeat:no-repeat next to dark focus caret image", () => {
    // Dark focus stroke is #3bc9db → %233bc9db in the data URI.
    const darkFocusStroke = "stroke='%233bc9db'";
    const idx = minified.indexOf(darkFocusStroke);
    expect(idx, "dark focus caret SVG missing from bundle").toBeGreaterThan(-1);
    // Look at a window around the SVG for the co-declared longhands.
    const window = minified.slice(Math.max(0, idx - 200), idx + 400);
    expect(window).toContain("background-repeat:no-repeat");
    expect(window).toMatch(/background-position:right\s*\.?75rem\s*center/);
    expect(window).toContain("background-size:var(--vd-select-arrow-size)");
  });

  it("keeps background-repeat:no-repeat next to light focus caret image", () => {
    // Light focus stroke is #22b8cf → %2322b8cf.
    const lightFocusStroke = "stroke='%2322b8cf'";
    const idx = minified.indexOf(lightFocusStroke);
    expect(idx, "light focus caret SVG missing from bundle").toBeGreaterThan(
      -1,
    );
    const window = minified.slice(Math.max(0, idx - 200), idx + 400);
    expect(window).toContain("background-repeat:no-repeat");
  });
});
