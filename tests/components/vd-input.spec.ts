import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdInput from "../../src/components/VdInput.vue";

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdInput, { props: { modelValue: "", ...props } });

describe("VdInput", () => {
  it("renders the form-group structure with a vd-input inside vd-input-group", () => {
    const wrapper = factory();
    const group = wrapper.get("div.vd-form-group");
    const input = group.get(".vd-input-group > input.vd-input");
    expect(input.attributes("type")).toBe("text");
    expect(input.classes()).toContain("vd-input-md");
  });

  it("links the label to the input via the id prop", () => {
    const wrapper = factory({ label: "Email", id: "email" });
    const label = wrapper.get("label.vd-form-label");
    expect(label.text()).toBe("Email");
    expect(label.attributes("for")).toBe("email");
    expect(wrapper.get("input").attributes("id")).toBe("email");
  });

  it("falls back to the name prop and then a generated id", () => {
    const named = factory({ label: "User", name: "username" });
    expect(named.get("input").attributes("id")).toBe("username");

    const auto = factory({ label: "Auto" });
    const autoId = auto.get("input").attributes("id");
    expect(autoId).toBeTruthy();
    expect(auto.get("label").attributes("for")).toBe(autoId);
  });

  it.each(["sm", "md", "lg"] as const)(
    "maps size=%s to vd-input-%s",
    (size) => {
      const wrapper = factory({ size });
      expect(wrapper.get("input").classes()).toContain(`vd-input-${size}`);
    },
  );

  it.each(["success", "danger"] as const)(
    "maps variant=%s to vd-input-%s",
    (variant) => {
      const wrapper = factory({ variant });
      expect(wrapper.get("input").classes()).toContain(`vd-input-${variant}`);
    },
  );

  it("renders prefix and suffix affixes only when provided", () => {
    const bare = factory();
    expect(bare.find(".vd-input-group-prefix").exists()).toBe(false);
    expect(bare.find(".vd-input-group-suffix").exists()).toBe(false);

    const wrapper = factory({ prefix: "€", suffix: "kg" });
    expect(wrapper.get(".vd-input-group-prefix").text()).toBe("€");
    expect(wrapper.get(".vd-input-group-suffix").text()).toBe("kg");
  });

  it("shows the hint with vd-form-help wired through aria-describedby", () => {
    const wrapper = factory({ hint: "At least 8 characters", id: "pw" });
    const hint = wrapper.get("span.vd-form-help");
    expect(hint.text()).toBe("At least 8 characters");
    expect(hint.attributes("id")).toBe("pw-hint");
    expect(wrapper.get("input").attributes("aria-describedby")).toBe("pw-hint");
    expect(wrapper.get("input").attributes("aria-invalid")).toBeUndefined();
  });

  it("error replaces the hint, sets aria-invalid and the danger class", () => {
    const wrapper = factory({
      hint: "Helpful",
      error: "Required field",
      id: "field",
    });
    const error = wrapper.get("span.vd-form-error");
    expect(error.text()).toBe("Required field");
    expect(error.attributes("id")).toBe("field-error");
    expect(wrapper.find(".vd-form-help").exists()).toBe(false);

    const input = wrapper.get("input");
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(input.attributes("aria-describedby")).toBe("field-error");
    expect(input.classes()).toContain("vd-input-danger");
  });

  it("error styling wins over an explicit success variant", () => {
    const wrapper = factory({ variant: "success", error: "Nope" });
    const input = wrapper.get("input");
    expect(input.classes()).toContain("vd-input-danger");
    expect(input.classes()).not.toContain("vd-input-success");
  });

  it("forwards native constraint attributes to the input", () => {
    const wrapper = factory({
      type: "number",
      name: "qty",
      placeholder: "0",
      disabled: true,
      readonly: true,
      required: true,
      min: 1,
      max: 10,
      step: 2,
      autocomplete: "off",
    });
    const attrs = wrapper.get("input").attributes();
    expect(attrs.type).toBe("number");
    expect(attrs.name).toBe("qty");
    expect(attrs.placeholder).toBe("0");
    expect(attrs.disabled).toBeDefined();
    expect(attrs.readonly).toBeDefined();
    expect(attrs.required).toBeDefined();
    expect(attrs.min).toBe("1");
    expect(attrs.max).toBe("10");
    expect(attrs.step).toBe("2");
    expect(attrs.autocomplete).toBe("off");
  });

  it("emits update:modelValue with the string value on input", async () => {
    const wrapper = factory();
    await wrapper.get("input").setValue("hello");
    expect(wrapper.emitted("update:modelValue")).toEqual([["hello"]]);
  });

  it("emits a number for type=number inputs, but an empty string when cleared", async () => {
    const wrapper = factory({ type: "number", modelValue: 1 });
    const input = wrapper.get("input");

    await input.setValue("42");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([42]);

    await input.setValue("");
    expect(wrapper.emitted("update:modelValue")![1]).toEqual([""]);
  });

  it("emits focus and blur events", async () => {
    const wrapper = factory();
    const input = wrapper.get("input");
    await input.trigger("focus");
    await input.trigger("blur");
    expect(wrapper.emitted("focus")).toHaveLength(1);
    expect(wrapper.emitted("blur")).toHaveLength(1);
    expect(wrapper.emitted("blur")![0]![0]).toBeInstanceOf(FocusEvent);
  });
});
