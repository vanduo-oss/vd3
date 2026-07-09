/**
 * VdSlider — labelled range input with v-model:number.
 */
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import VdSlider from "../../src/components/VdSlider.vue";

describe("VdSlider", () => {
  it("renders the field structure with range defaults and aria values", () => {
    const w = mount(VdSlider, { props: { modelValue: 25 } });

    expect(w.classes()).toContain("vd-slider-field");
    expect(w.find(".vd-slider-row").exists()).toBe(true);

    const input = w.find("input.vd-slider");
    expect(input.exists()).toBe(true);
    expect(input.attributes("type")).toBe("range");
    expect(input.attributes("min")).toBe("0");
    expect(input.attributes("max")).toBe("100");
    expect(input.attributes("step")).toBe("1");
    expect((input.element as HTMLInputElement).value).toBe("25");
    expect(input.attributes("aria-valuemin")).toBe("0");
    expect(input.attributes("aria-valuemax")).toBe("100");
    expect(input.attributes("aria-valuenow")).toBe("25");
    expect(input.attributes("disabled")).toBeUndefined();
  });

  it("passes min/max/step through to both attrs and aria bounds", () => {
    const w = mount(VdSlider, {
      props: { modelValue: 2, min: 1, max: 5, step: 0.5 },
    });
    const input = w.find("input.vd-slider");
    expect(input.attributes("min")).toBe("1");
    expect(input.attributes("max")).toBe("5");
    expect(input.attributes("step")).toBe("0.5");
    expect(input.attributes("aria-valuemin")).toBe("1");
    expect(input.attributes("aria-valuemax")).toBe("5");
    expect(input.attributes("aria-valuenow")).toBe("2");
  });

  it("renders no label element without a label prop", () => {
    const w = mount(VdSlider, { props: { modelValue: 0 } });
    expect(w.find("label").exists()).toBe(false);
  });

  it("wires the label to the input via the id prop", () => {
    const w = mount(VdSlider, {
      props: { modelValue: 10, label: "Volume", id: "vol", name: "volume" },
    });
    const label = w.find("label.vd-form-label");
    expect(label.text()).toBe("Volume");
    expect(label.attributes("for")).toBe("vol");
    const input = w.find("input.vd-slider");
    expect(input.attributes("id")).toBe("vol");
    expect(input.attributes("name")).toBe("volume");
  });

  it("falls back to the name prop for the id", () => {
    const w = mount(VdSlider, {
      props: { modelValue: 10, label: "Volume", name: "volume" },
    });
    expect(w.find("label").attributes("for")).toBe("volume");
    expect(w.find("input").attributes("id")).toBe("volume");
  });

  it("generates a stable auto id when neither id nor name is set", () => {
    const w = mount(VdSlider, { props: { modelValue: 10, label: "Volume" } });
    const id = w.find("input").attributes("id");
    expect(id).toBeTruthy();
    expect(w.find("label").attributes("for")).toBe(id);
  });

  it("shows the current value only when showValue is set", () => {
    const without = mount(VdSlider, { props: { modelValue: 30 } });
    expect(without.find(".vd-slider-value").exists()).toBe(false);

    const w = mount(VdSlider, { props: { modelValue: 30, showValue: true } });
    expect(w.find(".vd-slider-value").text()).toBe("30");
  });

  it("disables the input when disabled=true", () => {
    const w = mount(VdSlider, { props: { modelValue: 0, disabled: true } });
    expect(w.find("input").attributes("disabled")).toBeDefined();
  });

  it("emits update:modelValue with a number on input", async () => {
    const w = mount(VdSlider, { props: { modelValue: 10 } });
    await w.find("input").setValue("42");
    expect(w.emitted("update:modelValue")).toEqual([[42]]);
  });

  it("reflects an external modelValue update back into the input", async () => {
    const w = mount(VdSlider, { props: { modelValue: 10 } });
    await w.setProps({ modelValue: 60 });
    const input = w.find("input");
    expect((input.element as HTMLInputElement).value).toBe("60");
    expect(input.attributes("aria-valuenow")).toBe("60");
  });
});
