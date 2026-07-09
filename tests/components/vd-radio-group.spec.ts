import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdRadioGroup from "../../src/components/VdRadioGroup.vue";
import type { VdRadioOption } from "../../src/components/form-types";

const options: readonly VdRadioOption[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma", disabled: true },
];

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdRadioGroup, {
    props: { options, modelValue: "a", name: "grp", ...props },
  });

describe("VdRadioGroup", () => {
  it("renders a radiogroup with one vd-form-radio per option", () => {
    const wrapper = factory();
    expect(wrapper.classes()).toContain("vd-form-radio-group");
    expect(wrapper.attributes("role")).toBe("radiogroup");

    const radios = wrapper.findAll(".vd-form-radio");
    expect(radios).toHaveLength(3);
    expect(radios[0].classes()).toContain("vd-form-radio-md"); // default size
    expect(radios[0].classes()).not.toContain("vd-form-radio-inline");
    expect(wrapper.classes()).not.toContain("vd-form-radio-group-inline");
  });

  it("wires inputs and labels with the name-value id contract", () => {
    const wrapper = factory();
    const input = wrapper.find("input#grp-a");
    expect(input.exists()).toBe(true);
    expect(input.classes()).toContain("vd-form-radio-input");
    expect(input.attributes("type")).toBe("radio");
    expect(input.attributes("name")).toBe("grp");
    expect((input.element as HTMLInputElement).value).toBe("a");

    const label = wrapper.find("label[for='grp-a']");
    expect(label.classes()).toContain("vd-form-radio-label");
    expect(label.text()).toBe("Alpha");
  });

  it("checks only the input matching modelValue", () => {
    const wrapper = factory({ modelValue: "b" });
    expect(
      (wrapper.find("input#grp-a").element as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (wrapper.find("input#grp-b").element as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("emits update:modelValue with the option value on change", async () => {
    const wrapper = factory();
    await wrapper.find("input#grp-b").trigger("change");
    expect(wrapper.emitted("update:modelValue")).toEqual([["b"]]);
  });

  it.each(["sm", "md", "lg"] as const)(
    "maps size=%s to vd-form-radio-%s",
    (size) => {
      const wrapper = factory({ size });
      for (const radio of wrapper.findAll(".vd-form-radio")) {
        expect(radio.classes()).toContain(`vd-form-radio-${size}`);
      }
    },
  );

  it("adds inline classes on the group and each radio", () => {
    const wrapper = factory({ inline: true });
    expect(wrapper.classes()).toContain("vd-form-radio-group-inline");
    for (const radio of wrapper.findAll(".vd-form-radio")) {
      expect(radio.classes()).toContain("vd-form-radio-inline");
    }
  });

  it("disables individual options via option.disabled", () => {
    const wrapper = factory();
    expect(wrapper.find("input#grp-c").attributes("disabled")).toBeDefined();
    expect(wrapper.find("input#grp-a").attributes("disabled")).toBeUndefined();
  });

  it("disables every input when the group is disabled", () => {
    const wrapper = factory({ disabled: true });
    for (const input of wrapper.findAll("input")) {
      expect(input.attributes("disabled")).toBeDefined();
    }
  });

  it("renders a Phosphor icon inside the label when option.icon is set", () => {
    const wrapper = factory({
      options: [{ value: "s", label: "Starred", icon: "star" }],
      modelValue: "s",
    });
    const icon = wrapper.find("label i.vd-form-radio-icon");
    expect(icon.exists()).toBe(true);
    expect(icon.classes()).toContain("ph");
    expect(icon.classes()).toContain("ph-star");
    expect(icon.attributes("aria-hidden")).toBe("true");
  });
});
