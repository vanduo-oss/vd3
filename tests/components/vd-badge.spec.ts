import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdBadge from "../../src/components/VdBadge.vue";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("VdBadge", () => {
  it("renders a span.vd-badge with slot content and the primary default variant", () => {
    const wrapper = mount(VdBadge, { slots: { default: "New" } });

    expect(wrapper.element.tagName).toBe("SPAN");
    expect(wrapper.classes()).toContain("vd-badge");
    expect(wrapper.classes()).toContain("vd-badge-primary");
    expect(wrapper.classes()).not.toContain("vd-badge-pill");
    expect(wrapper.text()).toBe("New");
  });

  it.each([
    "primary",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
  ] as const)("variant=%s maps to vd-badge-%s", (variant) => {
    const wrapper = mount(VdBadge, { props: { variant } });
    expect(wrapper.classes()).toContain(`vd-badge-${variant}`);
  });

  it("adds vd-badge-pill when pill is true", () => {
    const wrapper = mount(VdBadge, { props: { pill: true } });
    expect(wrapper.classes()).toContain("vd-badge-pill");
    // Variant class is still applied alongside the pill modifier.
    expect(wrapper.classes()).toContain("vd-badge-primary");
  });

  it("sets theme-adaptive text and border tokens on .vd-badge-outlined so un-tinted outlined badges stay visible in dark mode", () => {
    const css = readFileSync(
      resolve(repoRoot, "css/components/badges.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\.vd-badge-outlined,\s*\.vd-badge-outline\s*\{[^}]*color:\s*var\(--vd-text-secondary\)[^}]*border:\s*1px\s+solid\s+var\(--vd-border-color\)/,
    );
  });
});
