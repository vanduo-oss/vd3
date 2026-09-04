/**
 * On-fill contrast contract: semantic tokens pick black/white ink so every
 * shipped primary/status fill meets WCAG 4.5:1, and filled selectors consume
 * those tokens instead of hardcoded white.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const lum = ([r, g, b]: [number, number, number]) =>
  0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

const contrast = (a: string, b: string) => {
  const L1 = lum(hexToRgb(a));
  const L2 = lum(hexToRgb(b));
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
};

const WHITE = "#ffffff";
const BLACK = "#000000";
const inkFor = (fill: string) =>
  contrast(WHITE, fill) >= 4.5 ? "white" : "black";

/** Open Color rest (step 5) / hover (step 7) / dark rest (step 4). */
const OC_PRIMARY: Record<string, { 4: string; 5: string; 7: string }> = {
  black: { 4: "#a3a3a3", 5: "#525252", 7: "#262626" },
  red: { 4: "#ff8787", 5: "#ff6b6b", 7: "#f03e3e" },
  orange: { 4: "#ffa94d", 5: "#ff922b", 7: "#f76707" },
  amber: { 4: "#fbbf24", 5: "#f59e0b", 7: "#b45309" },
  yellow: { 4: "#ffd43b", 5: "#fcc419", 7: "#f59f00" },
  lime: { 4: "#a9e34b", 5: "#94d82d", 7: "#74b816" },
  green: { 4: "#69db7c", 5: "#51cf66", 7: "#37b24d" },
  teal: { 4: "#38d9a9", 5: "#20c997", 7: "#0ca678" },
  cyan: { 4: "#3bc9db", 5: "#22b8cf", 7: "#1098ad" },
  sky: { 4: "#38bdf8", 5: "#0ea5e9", 7: "#0369a1" },
  blue: { 4: "#4dabf7", 5: "#339af0", 7: "#1c7ed6" },
  indigo: { 4: "#748ffc", 5: "#5c7cfa", 7: "#4263eb" },
  violet: { 4: "#9775fa", 5: "#845ef7", 7: "#7048e8" },
  purple: { 4: "#da77f2", 5: "#cc5de8", 7: "#ae3ec9" },
  fuchsia: { 4: "#e879f9", 5: "#d946ef", 7: "#a21caf" },
  pink: { 4: "#f783ac", 5: "#f06595", 7: "#d6336c" },
  rose: { 4: "#fb7185", 5: "#f43f5e", 7: "#be123c" },
};

const STATUS_FILLS = {
  secondary: "#20c997",
  success: "#40c057",
  warning: "#fab005",
  error: "#fa5252",
  info: "#228be6",
};

const tokensCss = read("css/core/tokens.css");
const rootBody = tokensCss.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

const BRIGHT_HOVER_HUES = [
  "red",
  "orange",
  "yellow",
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
] as const;

describe("on-fill token defaults", () => {
  it("defaults on-primary to black and hover to white (indigo)", () => {
    expect(rootBody).toMatch(/--vd-text-on-primary:\s*var\(--vd-color-black\)/);
    expect(rootBody).toMatch(
      /--vd-text-on-primary-hover:\s*var\(--vd-color-white\)/,
    );
    expect(rootBody).toMatch(/--vd-text-on-status:\s*var\(--vd-color-black\)/);
  });

  it("does not reset on-primary to white in dark theme", () => {
    expect(tokensCss).toMatch(
      /\[data-theme="dark"\][\s\S]*?--vd-text-on-primary:\s*var\(--vd-color-black\)/,
    );
    expect(tokensCss).not.toMatch(
      /\[data-theme="dark"\][\s\S]*?--vd-text-on-primary:\s*var\(--vd-color-white\)/,
    );
  });

  it("keeps light black-primary on white ink", () => {
    expect(tokensCss).toMatch(
      /html\[data-primary="black"\]\s*\{[^}]*--vd-text-on-primary:\s*var\(--vd-color-white\)/,
    );
  });

  it("lists every hue whose light hover still fails 4.5:1 with white", () => {
    for (const hue of BRIGHT_HOVER_HUES) {
      expect(tokensCss).toContain(`html[data-primary="${hue}"]`);
    }
    expect(inkFor(OC_PRIMARY.indigo[7])).toBe("white");
    expect(inkFor(OC_PRIMARY.yellow[7])).toBe("black");
  });
});

describe("Open Color fill/ink matrix", () => {
  it("default indigo rest fails with white and passes with black", () => {
    expect(contrast(WHITE, OC_PRIMARY.indigo[5])).toBeLessThan(4.5);
    expect(contrast(BLACK, OC_PRIMARY.indigo[5])).toBeGreaterThanOrEqual(4.5);
  });

  it("every rest fill has a passing black-or-white pair", () => {
    for (const [name, steps] of Object.entries(OC_PRIMARY)) {
      const restInk = inkFor(steps[5]);
      const hoverInk = inkFor(steps[7]);
      const darkRestInk = inkFor(steps[4]);
      expect(
        contrast(restInk === "white" ? WHITE : BLACK, steps[5]),
        `${name} light rest`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(hoverInk === "white" ? WHITE : BLACK, steps[7]),
        `${name} light hover`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(darkRestInk === "white" ? WHITE : BLACK, steps[4]),
        `${name} dark rest`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("status fills all need dark ink", () => {
    for (const [name, fill] of Object.entries(STATUS_FILLS)) {
      expect(inkFor(fill), name).toBe("black");
      expect(contrast(BLACK, fill), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("yellow stays dark-ink in both themes", () => {
    expect(inkFor(OC_PRIMARY.yellow[5])).toBe("black");
    expect(inkFor(OC_PRIMARY.yellow[4])).toBe("black");
    expect(inkFor(OC_PRIMARY.yellow[7])).toBe("black");
  });
});

describe("filled selectors consume on-fill tokens", () => {
  const files = [
    "css/components/buttons.css",
    "css/components/chips.css",
    "css/components/badges.css",
    "css/components/alerts.css",
    "css/components/toast.css",
    "css/components/tabs.css",
    "css/components/pagination.css",
    "css/components/avatar.css",
    "css/components/footer.css",
    "css/components/fab.css",
    "css/components/datepicker.css",
    "css/components/timepicker.css",
    "css/components/suggest.css",
    "css/components/waypoint.css",
    "css/components/spotlight.css",
    "css/components/stepper.css",
    "css/components/progress.css",
    "css/components/timeline.css",
    "css/components/forms.css",
    "css/utilities/table.css",
  ];

  it("known filled families no longer hardcode white ink", () => {
    const leftover: string[] = [];
    const allowWhiteVar = /buttons\.css$|table\.css$|badges\.css$/;
    for (const rel of files) {
      const css = read(rel);
      if (
        /color:\s*var\(--vd-color-white\)/.test(css) &&
        !allowWhiteVar.test(rel)
      ) {
        leftover.push(`${rel} still has color: var(--vd-color-white)`);
      }
      if (/color:\s*#fff\b/i.test(css)) {
        leftover.push(`${rel} still has color: #fff`);
      }
    }
    // Light ink hover is the one intentional white-on-black in buttons.css.
    const buttons = read("css/components/buttons.css");
    expect(buttons).toContain(
      ".vd-btn-ink:hover:not(:disabled):not(.disabled):not(.is-disabled)",
    );
    expect(buttons).toMatch(
      /\.vd-btn-ink:hover[\s\S]*?color:\s*var\(--vd-color-white\)/,
    );
    expect(leftover, leftover.join("\n")).toEqual([]);
  });

  it("primary filled button and spinner use on-primary tokens", () => {
    const css = read("css/components/buttons.css");
    expect(css).toMatch(
      /\.vd-btn-primary\s*\{[^}]*color:\s*var\(--vd-text-on-primary\)/,
    );
    expect(css).toMatch(
      /\.vd-btn-primary:hover[\s\S]*?color:\s*var\(--vd-text-on-primary-hover\)/,
    );
    expect(css).toMatch(
      /\.vd-btn-primary\.is-loading::after[\s\S]*?border-color:\s*var\(--vd-text-on-primary\)/,
    );
    expect(css).toMatch(
      /\.vd-btn-primary \.vd-btn-spinner[\s\S]*?border-color:\s*var\(--vd-text-on-primary\)/,
    );
  });

  it("status filled buttons use on-status", () => {
    const css = read("css/components/buttons.css");
    for (const cls of [
      ".vd-btn-secondary",
      ".vd-btn-success",
      ".vd-btn-warning",
      ".vd-btn-info",
    ]) {
      expect(css).toMatch(
        new RegExp(
          `${cls.replace(".", "\\.")}\\s*\\{[^}]*color:\\s*var\\(--vd-text-on-status\\)`,
        ),
      );
    }
  });
});

describe("intentional white-on-dark negatives", () => {
  it("keeps light ink on dark surfaces", () => {
    expect(read("css/components/badges.css")).toMatch(
      /\.vd-badge-dark\s*\{[^}]*color:\s*var\(--vd-color-white\)/,
    );
    expect(read("css/utilities/table.css")).toMatch(
      /\.vd-table-dark,[\s\S]*?color:\s*var\(--vd-color-white\)/,
    );
    expect(read("css/components/spinner.css")).toContain(
      ".vd-spinner-light { --vd-spinner-color: #fff; }",
    );
    expect(read("css/components/tooltips.css")).toContain(
      "--vd-tooltip-text-color: var(--vd-color-white)",
    );
  });
});
