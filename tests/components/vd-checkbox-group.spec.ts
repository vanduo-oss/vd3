import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdCheckboxGroup from "../../src/components/VdCheckboxGroup.vue";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma", disabled: true },
];

const baseProps = { options, modelValue: [] as string[], name: "letters" };

describe("VdCheckboxGroup", () => {
  it("renders a role=group wrapper with one vd-form-check per option", () => {
    const wrapper = mount(VdCheckboxGroup, { props: baseProps });

    expect(wrapper.classes()).toContain("vd-form-check-group");
    expect(wrapper.classes()).not.toContain("vd-form-check-group-inline");
    expect(wrapper.attributes("role")).toBe("group");

    const checks = wrapper.findAll(".vd-form-check");
    expect(checks).toHaveLength(3);
    // md default size on each row.
    for (const check of checks) {
      expect(check.classes()).toContain("vd-form-check-md");
      expect(check.classes()).not.toContain("vd-form-check-inline");
    }
  });

  it("wires each input to its label via name-value id and for/id pairing", () => {
    const wrapper = mount(VdCheckboxGroup, { props: baseProps });

    const first = wrapper.findAll(".vd-form-check")[0];
    const input = first.get("input.vd-form-check-input");
    const label = first.get("label.vd-form-check-label");

    expect(input.attributes("type")).toBe("checkbox");
    expect(input.attributes("id")).toBe("letters-a");
    expect(input.attributes("name")).toBe("letters");
    expect(input.attributes("value")).toBe("a");
    expect(label.attributes("for")).toBe("letters-a");
    expect(label.text()).toBe("Alpha");
  });

  it("checks inputs whose values are in modelValue", () => {
    const wrapper = mount(VdCheckboxGroup, {
      props: { ...baseProps, modelValue: ["a", "c"] },
    });

    const inputs = wrapper.findAll<HTMLInputElement>("input");
    expect(inputs[0].element.checked).toBe(true);
    expect(inputs[1].element.checked).toBe(false);
    expect(inputs[2].element.checked).toBe(true);
  });

  it("inline adds the inline classes on the group and each row", () => {
    const wrapper = mount(VdCheckboxGroup, {
      props: { ...baseProps, inline: true },
    });

    expect(wrapper.classes()).toContain("vd-form-check-group-inline");
    for (const check of wrapper.findAll(".vd-form-check")) {
      expect(check.classes()).toContain("vd-form-check-inline");
    }
  });

  it.each(["sm", "md", "lg"] as const)(
    "size=%s maps to vd-form-check-%s on each row",
    (size) => {
      const wrapper = mount(VdCheckboxGroup, {
        props: { ...baseProps, size },
      });
      for (const check of wrapper.findAll(".vd-form-check")) {
        expect(check.classes()).toContain(`vd-form-check-${size}`);
      }
    },
  );

  it("per-option disabled disables only that input", () => {
    const wrapper = mount(VdCheckboxGroup, { props: baseProps });

    const inputs = wrapper.findAll<HTMLInputElement>("input");
    expect(inputs[0].element.disabled).toBe(false);
    expect(inputs[1].element.disabled).toBe(false);
    expect(inputs[2].element.disabled).toBe(true);
  });

  it("group disabled disables every input", () => {
    const wrapper = mount(VdCheckboxGroup, {
      props: { ...baseProps, disabled: true },
    });

    for (const input of wrapper.findAll<HTMLInputElement>("input")) {
      expect(input.element.disabled).toBe(true);
    }
  });

  it("emits update:modelValue with the value added on check", async () => {
    const wrapper = mount(VdCheckboxGroup, {
      props: { ...baseProps, modelValue: ["a"] },
    });

    await wrapper.findAll("input")[1].trigger("change");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["a", "b"]]);
  });

  it("emits update:modelValue with the value removed on uncheck", async () => {
    const wrapper = mount(VdCheckboxGroup, {
      props: { ...baseProps, modelValue: ["a", "b"] },
    });

    await wrapper.findAll("input")[0].trigger("change");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["b"]]);
  });

  it("v-model round-trip toggles the checked state", async () => {
    const wrapper = mount(VdCheckboxGroup, {
      props: {
        ...baseProps,
        "onUpdate:modelValue": (value: string[]) =>
          wrapper.setProps({ modelValue: value }),
      },
    });

    const first = wrapper.findAll<HTMLInputElement>("input")[0];
    await first.trigger("change");
    expect(first.element.checked).toBe(true);

    await first.trigger("change");
    expect(first.element.checked).toBe(false);
  });
});
