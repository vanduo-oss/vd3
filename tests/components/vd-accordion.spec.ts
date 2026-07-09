import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdAccordion from "../../src/components/VdAccordion.vue";

const items = [
  { id: "one", title: "First", content: "First content" },
  { id: "two", title: "Second", content: "Second content" },
];

describe("VdAccordion", () => {
  it("renders a vd-accordion list with one vd-accordion-item per item", () => {
    const wrapper = mount(VdAccordion, {
      props: { items, modelValue: [] },
    });

    expect(wrapper.element.tagName).toBe("UL");
    expect(wrapper.classes()).toContain("vd-accordion");
    const listItems = wrapper.findAll("li.vd-accordion-item");
    expect(listItems).toHaveLength(2);
    // Each item exposes a header button and a panel.
    expect(wrapper.findAll("button.vd-accordion-header")).toHaveLength(2);
    expect(wrapper.findAll(".vd-accordion-panel")).toHaveLength(2);
  });

  it("marks open items with is-open and wires aria-expanded/aria-controls", () => {
    const wrapper = mount(VdAccordion, {
      props: { items, modelValue: ["one"] },
    });

    const [first, second] = wrapper.findAll("li.vd-accordion-item");
    expect(first.classes()).toContain("is-open");
    expect(second.classes()).not.toContain("is-open");

    const firstHeader = first.get("button.vd-accordion-header");
    expect(firstHeader.attributes("type")).toBe("button");
    expect(firstHeader.attributes("aria-expanded")).toBe("true");
    expect(firstHeader.attributes("aria-controls")).toBe(
      "vd-accordion-panel-one",
    );
    expect(
      second.get("button.vd-accordion-header").attributes("aria-expanded"),
    ).toBe("false");

    const firstPanel = first.get(".vd-accordion-panel");
    expect(firstPanel.attributes("id")).toBe("vd-accordion-panel-one");
    expect(firstPanel.attributes("role")).toBe("region");
    // v-show: open panel visible, closed panel hidden.
    expect(firstPanel.isVisible()).toBe(true);
    expect(second.get(".vd-accordion-panel").isVisible()).toBe(false);
  });

  it("renders +/− toggle icon as aria-hidden depending on open state", () => {
    const wrapper = mount(VdAccordion, {
      props: { items, modelValue: ["one"] },
    });

    const icons = wrapper.findAll(".vd-accordion-icon");
    expect(icons[0].attributes("aria-hidden")).toBe("true");
    expect(icons[0].text()).toBe("−");
    expect(icons[1].text()).toBe("+");
  });

  it("renders item.content as the default panel body and named slots per item id", () => {
    const wrapper = mount(VdAccordion, {
      props: { items, modelValue: [] },
      slots: {
        two: '<em class="custom">Custom body</em>',
      },
    });

    const panels = wrapper.findAll(".vd-accordion-panel");
    expect(panels[0].text()).toContain("First content");
    expect(panels[1].find("em.custom").exists()).toBe(true);
    expect(panels[1].text()).toContain("Custom body");
  });

  it("multi mode: clicking headers emits update:modelValue adding/removing ids", async () => {
    const wrapper = mount(VdAccordion, {
      props: { items, modelValue: ["one"] },
    });

    const headers = wrapper.findAll("button.vd-accordion-header");
    await headers[1].trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["one", "two"]]);

    await headers[0].trigger("click");
    // Parent did not update the prop, so 'one' is removed from ['one'].
    expect(wrapper.emitted("update:modelValue")?.[1]).toEqual([[]]);
  });

  it("exclusive mode: string v-model toggles between id and empty string", async () => {
    const wrapper = mount(VdAccordion, {
      props: { items, modelValue: "one", exclusive: true },
    });

    const [first, second] = wrapper.findAll("li.vd-accordion-item");
    expect(first.classes()).toContain("is-open");
    expect(second.classes()).not.toContain("is-open");

    const headers = wrapper.findAll("button.vd-accordion-header");
    await headers[1].trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["two"]);

    // Clicking the already-open item closes it (emits empty string).
    await headers[0].trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[1]).toEqual([""]);
  });

  it("v-model round-trip opens the clicked panel", async () => {
    const wrapper = mount(VdAccordion, {
      props: {
        items,
        modelValue: [] as string[],
        "onUpdate:modelValue": (value: string | string[]) =>
          wrapper.setProps({ modelValue: value }),
      },
    });

    await wrapper.findAll("button.vd-accordion-header")[1].trigger("click");
    const second = wrapper.findAll("li.vd-accordion-item")[1];
    expect(second.classes()).toContain("is-open");
    expect(second.get(".vd-accordion-panel").isVisible()).toBe(true);
  });
});
