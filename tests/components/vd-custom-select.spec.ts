import { describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import VdCustomSelect from "../../src/components/VdCustomSelect.vue";

const options = [
  { value: "lt", label: "Lithuania" },
  { value: "lv", label: "Latvia" },
  { value: "ee", label: "Estonia", disabled: true },
  { value: "pl", label: "Poland" },
];

const factory = (props: Record<string, unknown> = {}): VueWrapper =>
  mount(VdCustomSelect, {
    props: { modelValue: "", options, ...props },
  });

describe("VdCustomSelect", () => {
  it("renders the wrapper, a hidden native select mirror, button and listbox", () => {
    const wrapper = factory({ id: "country" });
    const root = wrapper.get("div.custom-select-wrapper");

    const native = root.get("select");
    expect(native.attributes("id")).toBe("country");
    expect(native.attributes("tabindex")).toBe("-1");
    expect(native.attributes("aria-hidden")).toBe("true");
    expect(native.findAll("option")).toHaveLength(4);
    expect(
      native.find("option[value='ee']").attributes("disabled"),
    ).toBeDefined();

    const button = root.get("button.custom-select-button");
    expect(button.attributes("type")).toBe("button");
    expect(button.attributes("aria-haspopup")).toBe("listbox");
    expect(button.attributes("aria-labelledby")).toBe("country");

    const dropdown = root.get("div.custom-select-dropdown");
    expect(dropdown.attributes("role")).toBe("listbox");
    expect(dropdown.findAll("[role='option']")).toHaveLength(4);
  });

  it("shows the placeholder when no option matches and the label when one does", async () => {
    const wrapper = factory({ placeholder: "Pick one" });
    const button = wrapper.get(".custom-select-button");
    expect(button.text()).toBe("Pick one");

    await wrapper.setProps({ modelValue: "lv" });
    expect(button.text()).toBe("Latvia");
  });

  it("toggles the dropdown open state and aria-expanded on button click", async () => {
    const wrapper = factory();
    const button = wrapper.get(".custom-select-button");
    const dropdown = wrapper.get(".custom-select-dropdown");

    expect(button.attributes("aria-expanded")).toBe("false");
    expect(dropdown.classes()).not.toContain("is-open");

    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("true");
    expect(dropdown.classes()).toContain("is-open");

    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(dropdown.classes()).not.toContain("is-open");
  });

  it("marks options with selection/disabled state classes and aria attributes", () => {
    const wrapper = factory({ modelValue: "lv" });
    const opts = wrapper.findAll(".custom-select-option");

    expect(opts[1]!.classes()).toContain("is-selected");
    expect(opts[1]!.attributes("aria-selected")).toBe("true");
    expect(opts[0]!.attributes("aria-selected")).toBe("false");
    expect(opts[0]!.attributes("data-value")).toBe("lt");

    expect(opts[2]!.classes()).toContain("is-disabled");
    expect(opts[2]!.attributes("aria-disabled")).toBe("true");
    expect(opts[0]!.attributes("aria-disabled")).toBeUndefined();
  });

  it("emits update:modelValue and closes when an option is clicked", async () => {
    const wrapper = factory();
    await wrapper.get(".custom-select-button").trigger("click");

    await wrapper.findAll(".custom-select-option")[3]!.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([["pl"]]);
    expect(wrapper.get(".custom-select-dropdown").classes()).not.toContain(
      "is-open",
    );
  });

  it("ignores clicks on disabled options", async () => {
    const wrapper = factory();
    await wrapper.get(".custom-select-button").trigger("click");

    await wrapper.findAll(".custom-select-option")[2]!.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.get(".custom-select-dropdown").classes()).toContain(
      "is-open",
    );
  });

  it("opens on ArrowDown, highlights the first selectable option and selects on Enter", async () => {
    const wrapper = factory();
    const button = wrapper.get(".custom-select-button");

    await button.trigger("keydown", { key: "ArrowDown" });
    const opts = wrapper.findAll(".custom-select-option");
    expect(wrapper.get(".custom-select-dropdown").classes()).toContain(
      "is-open",
    );
    expect(opts[0]!.classes()).toContain("is-active");

    await button.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")).toEqual([["lt"]]);
  });

  it("skips disabled options when moving the active item with arrows", async () => {
    const wrapper = factory();
    const button = wrapper.get(".custom-select-button");

    await button.trigger("keydown", { key: "ArrowDown" }); // open, active = 0
    await button.trigger("keydown", { key: "ArrowDown" }); // active = 1
    await button.trigger("keydown", { key: "ArrowDown" }); // skips disabled 2 -> 3

    const opts = wrapper.findAll(".custom-select-option");
    expect(opts[3]!.classes()).toContain("is-active");
    expect(opts[2]!.classes()).not.toContain("is-active");

    await button.trigger("keydown", { key: "ArrowUp" }); // back to 1
    expect(opts[1]!.classes()).toContain("is-active");
  });

  it("jumps to first/last selectable options with Home and End", async () => {
    const wrapper = factory();
    const button = wrapper.get(".custom-select-button");
    await button.trigger("keydown", { key: "ArrowDown" });

    await button.trigger("keydown", { key: "End" });
    const opts = wrapper.findAll(".custom-select-option");
    expect(opts[3]!.classes()).toContain("is-active");

    await button.trigger("keydown", { key: "Home" });
    expect(opts[0]!.classes()).toContain("is-active");
  });

  it("closes on Escape without emitting", async () => {
    const wrapper = factory();
    const button = wrapper.get(".custom-select-button");
    await button.trigger("click");

    await button.trigger("keydown", { key: "Escape" });
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("closes when clicking outside the component", async () => {
    const wrapper = factory();
    await wrapper.get(".custom-select-button").trigger("click");
    expect(wrapper.get(".custom-select-dropdown").classes()).toContain(
      "is-open",
    );

    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.get(".custom-select-dropdown").classes()).not.toContain(
      "is-open",
    );
    wrapper.unmount();
  });

  it("opens on Enter when closed and highlights the selected option", async () => {
    const wrapper = factory({ modelValue: "pl" });
    const button = wrapper.get(".custom-select-button");

    await button.trigger("keydown", { key: "Enter" });
    expect(wrapper.get(".custom-select-dropdown").classes()).toContain(
      "is-open",
    );
    expect(wrapper.findAll(".custom-select-option")[3]!.classes()).toContain(
      "is-active",
    );
  });
});
