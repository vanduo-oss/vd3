import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdTooltip from "../../src/components/VdTooltip.vue";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("VdTooltip", () => {
  it("renders the trigger without tooltip-surface styling", () => {
    const wrapper = mount(VdTooltip, {
      props: { text: "Hello" },
      slots: { default: "<button>Trigger</button>" },
    });
    expect(wrapper.element.tagName).toBe("SPAN");
    expect(wrapper.classes()).not.toContain("vd-tooltip");
    wrapper.unmount();
    expect(wrapper.get("button").text()).toBe("Trigger");
  });

  it("exposes the tooltip text via the data-tooltip attribute", () => {
    const wrapper = mount(VdTooltip, { props: { text: "Copy to clipboard" } });
    expect(wrapper.attributes("data-tooltip")).toBe("Copy to clipboard");
  });

  it("defaults data-tooltip-placement to top", () => {
    const wrapper = mount(VdTooltip, { props: { text: "t" } });
    expect(wrapper.attributes("data-tooltip-placement")).toBe("top");
  });

  it.each(["top", "bottom", "left", "right"] as const)(
    "maps position=%s to data-tooltip-placement",
    (position) => {
      const wrapper = mount(VdTooltip, { props: { text: "t", position } });
      expect(wrapper.attributes("data-tooltip-placement")).toBe(position);
    },
  );

  it("updates data-tooltip when the text prop changes", async () => {
    const wrapper = mount(VdTooltip, { props: { text: "before" } });
    await wrapper.setProps({ text: "after" });
    expect(wrapper.attributes("data-tooltip")).toBe("after");
  });
});

it("describes the slotted button on focus and removes only its own description on Escape", async () => {
  const wrapper = mount(VdTooltip, {
    attachTo: document.body,
    props: { text: "Copy this value" },
    slots: { default: '<button aria-describedby="existing">Copy</button>' },
  });
  const button = wrapper.get("button");
  (button.element as HTMLElement).focus();
  const tip = document.querySelector('[role="tooltip"]')!;
  expect(tip.textContent).toBe("Copy this value");
  expect(button.attributes("aria-describedby")).toBe(`existing ${tip.id}`);
  await button.trigger("keydown", { key: "Escape" });
  expect(document.querySelector('[role="tooltip"]')).toBeNull();
  expect(button.attributes("aria-describedby")).toBe("existing");
  expect(document.activeElement).toBe(button.element);
  wrapper.unmount();
});
