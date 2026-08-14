import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdCheckbox from "../../src/components/VdCheckbox.vue";

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdCheckbox, { props: { modelValue: false, ...props } });

describe("VdCheckbox", () => {
  it("renders the vd-form-check markup with a labelled checkbox", () => {
    const wrapper = factory({ label: "Remember me", id: "remember" });
    expect(wrapper.classes()).toContain("vd-form-check");
    expect(wrapper.classes()).not.toContain("vd-form-check-md");

    const input = wrapper.get("input.vd-form-check-input");
    expect(input.attributes("type")).toBe("checkbox");
    expect(input.attributes("id")).toBe("remember");
    expect(wrapper.get("label.vd-form-check-label").attributes("for")).toBe(
      "remember",
    );
    expect(wrapper.get("label").text()).toBe("Remember me");
  });

  it.each(["sm", "lg"] as const)("maps size=%s to vd-form-check-%s", (size) => {
    const wrapper = factory({ size });
    expect(wrapper.classes()).toContain(`vd-form-check-${size}`);
  });

  it("emits update:modelValue with the new checked state", async () => {
    const wrapper = factory({ modelValue: false });
    await wrapper.get("input").setValue(true);
    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
  });

  it("falls back to name then a generated id", () => {
    const named = factory({ name: "terms" });
    expect(named.get("input").attributes("id")).toBe("terms");
    expect(named.get("input").attributes("name")).toBe("terms");

    const auto = factory();
    const autoId = auto.get("input").attributes("id");
    expect(autoId).toBeTruthy();
    expect(auto.get("label").attributes("for")).toBe(autoId);
  });

  it("passes disabled through and prefers the default slot over the label prop", () => {
    expect(
      factory({ disabled: true }).get("input").attributes("disabled"),
    ).toBe("");

    const slotted = mount(VdCheckbox, {
      props: { modelValue: false, label: "Prop" },
      slots: { default: "Slot" },
    });
    expect(slotted.get("label").text()).toBe("Slot");
  });
});
