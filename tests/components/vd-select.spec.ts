import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdSelect from "../../src/components/VdSelect.vue";
import type { VdSelectOption } from "../../src/components/form-types";

const options: readonly VdSelectOption[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma", disabled: true },
];

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdSelect, { props: { options, modelValue: "a", ...props } });

describe("VdSelect", () => {
  it("renders a native select with the vd-input class and one option per entry", () => {
    const wrapper = factory();
    const select = wrapper.find("select");
    expect(select.exists()).toBe(true);
    expect(select.classes()).toContain("vd-input");

    const opts = wrapper.findAll("option");
    expect(opts).toHaveLength(3); // no placeholder by default
    expect(opts.map((o) => o.attributes("value"))).toEqual(["a", "b", "c"]);
    expect(opts.map((o) => o.text())).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("reflects modelValue as the selected value", () => {
    const wrapper = factory({ modelValue: "b" });
    expect((wrapper.find("select").element as HTMLSelectElement).value).toBe(
      "b",
    );
  });

  it("emits update:modelValue on change (v-model contract)", async () => {
    const wrapper = factory();
    await wrapper.find("select").setValue("b");
    expect(wrapper.emitted("update:modelValue")).toEqual([["b"]]);
  });

  it("renders a disabled placeholder option first when placeholder is set", () => {
    const wrapper = factory({ modelValue: "", placeholder: "Pick one" });
    const opts = wrapper.findAll("option");
    expect(opts).toHaveLength(4);
    expect(opts[0].text()).toBe("Pick one");
    expect(opts[0].attributes("value")).toBe("");
    expect(opts[0].attributes("disabled")).toBeDefined();
  });

  it("uses id when given, falling back to name", () => {
    const withId = factory({ id: "my-id", name: "my-name" });
    expect(withId.find("select").attributes("id")).toBe("my-id");
    expect(withId.find("select").attributes("name")).toBe("my-name");

    const nameOnly = factory({ name: "my-name" });
    expect(nameOnly.find("select").attributes("id")).toBe("my-name");
  });

  it("passes disabled and required through to the select", () => {
    const wrapper = factory({ disabled: true, required: true });
    const select = wrapper.find("select");
    expect(select.attributes("disabled")).toBeDefined();
    expect(select.attributes("required")).toBeDefined();

    const plain = factory();
    expect(plain.find("select").attributes("disabled")).toBeUndefined();
    expect(plain.find("select").attributes("required")).toBeUndefined();
  });

  it("disables individual options via option.disabled", () => {
    const wrapper = factory();
    const opts = wrapper.findAll("option");
    expect(opts[2].attributes("disabled")).toBeDefined();
    expect(opts[0].attributes("disabled")).toBeUndefined();
  });

  it("mirrors the selected label into the visually-hidden span", async () => {
    const wrapper = factory({ modelValue: "b" });
    expect(wrapper.find(".vd-visually-hidden").text()).toBe("Beta");

    await wrapper.setProps({ modelValue: "a" });
    expect(wrapper.find(".vd-visually-hidden").text()).toBe("Alpha");
  });

  it("renders an empty hidden label for an unknown value", () => {
    const wrapper = factory({ modelValue: "" });
    expect(wrapper.find(".vd-visually-hidden").text()).toBe("");
  });
});
