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

// Rendered color/contrast matrix lives in vd3-docs/tests/e2e/theme-colors.spec.ts.
// These checks enforce the CSS consumer contract; they do not choose ideal ink.
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
    const expectedWhiteVarCounts: Record<string, number> = {
      "css/components/buttons.css": 1,
      "css/components/badges.css": 1,
      "css/utilities/table.css": 1,
    };
    for (const rel of files) {
      const css = read(rel);
      const whiteVarCount =
        css.match(/^\s*color:\s*var\(--vd-color-white\)/gm)?.length ?? 0;
      const expectedWhiteVarCount = expectedWhiteVarCounts[rel] ?? 0;
      if (whiteVarCount !== expectedWhiteVarCount) {
        leftover.push(
          `${rel} has ${whiteVarCount} direct white-token foregrounds; expected ${expectedWhiteVarCount}`,
        );
      }
      if (/^\s*color:\s*#(?:fff|ffffff)\b/im.test(css)) {
        leftover.push(`${rel} still has a literal white foreground`);
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
    expect(css).toMatch(
      /\.vd-btn-error,\s*\.vd-btn-danger\s*\{[^}]*color:\s*var\(--vd-text-on-status\)/,
    );
  });
});

describe("intentional white-on-dark negatives", () => {
  it("keeps light ink on dark surfaces and media overlays", () => {
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
    const imageBox = read("css/components/image-box.css");
    expect(imageBox).toMatch(
      /\.vd-image-box-close\s*\{[^}]*color:\s*var\(--vd-color-white\)/,
    );
    expect(imageBox).toMatch(
      /\.vd-image-box-caption\s*\{[^}]*color:\s*var\(--vd-color-white\)/,
    );
    expect(read("css/components/flow.css")).toMatch(
      /\.vd-flow-caption\s*\{[^}]*color:\s*#fff/,
    );
    expect(read("css/components/expanding-cards.css")).toMatch(
      /\.vd-expanding-card-info\s*\{[^}]*color:\s*#fff/,
    );
  });
});
