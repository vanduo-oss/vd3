import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdSwitch from "../../src/components/VdSwitch.vue";

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdSwitch, { props: { modelValue: false, ...props } });

describe("VdSwitch", () => {
  it("renders a label.vd-form-switch wrapping a role=switch checkbox", () => {
    const wrapper = factory();
    expect(wrapper.element.tagName).toBe("LABEL");
    expect(wrapper.classes()).toContain("vd-form-switch");

    const input = wrapper.get("input");
    expect(input.classes()).toContain("vd-form-switch-input");
    expect(input.attributes("type")).toBe("checkbox");
    expect(input.attributes("role")).toBe("switch");
  });

  it("omits a size modifier for the default md size", () => {
    expect(factory().classes()).toEqual(["vd-form-switch"]);
  });

  it.each(["sm", "lg"] as const)(
    "maps size=%s to the vd-form-switch-<size> modifier",
    (size) => {
      const wrapper = factory({ size });
      expect(wrapper.classes()).toContain("vd-form-switch");
      expect(wrapper.classes()).toContain(`vd-form-switch-${size}`);
    },
  );

  it("reflects modelValue as the checkbox checked state", async () => {
    const wrapper = factory({ modelValue: true });
    expect((wrapper.get("input").element as HTMLInputElement).checked).toBe(
      true,
    );
    await wrapper.setProps({ modelValue: false });
    expect((wrapper.get("input").element as HTMLInputElement).checked).toBe(
      false,
    );
  });

  it("emits update:modelValue with the new checked state (v-model round-trip)", async () => {
    const wrapper = factory({ modelValue: false });
    await wrapper.get("input").setValue(true);
    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
  });

  it("links label to input via id, falling back to name then a generated id", () => {
    const withId = factory({ id: "sw-id", name: "sw-name" });
    expect(withId.get("label").attributes("for")).toBe("sw-id");
    expect(withId.get("input").attributes("id")).toBe("sw-id");
    expect(withId.get("input").attributes("name")).toBe("sw-name");

    const nameOnly = factory({ name: "sw-name" });
    expect(nameOnly.get("input").attributes("id")).toBe("sw-name");

    const auto = factory();
    const autoId = auto.get("input").attributes("id");
    expect(autoId).toBeTruthy();
    expect(auto.get("label").attributes("for")).toBe(autoId);
  });

  it("passes disabled through to the input", () => {
    expect(
      factory({ disabled: true }).get("input").attributes("disabled"),
    ).toBeDefined();
    expect(factory().get("input").attributes("disabled")).toBeUndefined();
  });

  it("renders the label prop, overridable by the default slot", () => {
    expect(
      factory({ label: "Wireless" }).get(".vd-form-switch-label").text(),
    ).toBe("Wireless");

    const slotted = mount(VdSwitch, {
      props: { modelValue: false, label: "Wireless" },
      slots: { default: "Custom" },
    });
    expect(slotted.get(".vd-form-switch-label").text()).toBe("Custom");
  });
});
