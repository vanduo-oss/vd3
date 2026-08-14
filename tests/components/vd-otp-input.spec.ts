import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import VdOtpInput from "../../src/components/VdOtpInput.vue";

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdOtpInput, { props: { modelValue: "", ...props } });

describe("VdOtpInput", () => {
  it("renders length digit cells with one-time-code on the first", () => {
    const wrapper = factory({ length: 6, id: "otp", name: "code" });
    const cells = wrapper.findAll("input.vd-otp-cell");
    expect(wrapper.classes()).toContain("vd-otp");
    expect(cells).toHaveLength(6);
    expect(cells[0]!.attributes("autocomplete")).toBe("one-time-code");
    expect(cells[0]!.attributes("id")).toBe("otp");
    expect(cells[0]!.attributes("name")).toBe("code");
    expect(cells[1]!.attributes("autocomplete")).toBe("off");
    expect(cells[0]!.attributes("inputmode")).toBe("numeric");
    expect(cells[0]!.attributes("aria-label")).toBe("Digit 1 of 6");
    expect(cells[5]!.attributes("aria-label")).toBe("Digit 6 of 6");
  });

  it("emits the joined digits as each cell is filled and advances focus", async () => {
    const wrapper = factory({ length: 4, id: "otp" });
    const cells = wrapper.findAll("input");
    const focus = vi.spyOn(cells[1]!.element as HTMLInputElement, "focus");

    await cells[0]!.setValue("1");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["1"]);
    expect(focus).toHaveBeenCalled();
  });

  it("keeps only the last digit when a cell receives extra characters", async () => {
    const wrapper = factory({ length: 3 });
    await wrapper.get("input").setValue("89");
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["9"]);
  });

  it("paste fills consecutive cells", async () => {
    const wrapper = factory({ length: 6 });
    await wrapper.get("input").trigger("paste", {
      clipboardData: { getData: () => "12ab34" },
    });
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual(["1234"]);
    expect(
      wrapper
        .findAll("input")
        .map((c) => (c.element as HTMLInputElement).value),
    ).toEqual(["1", "2", "3", "4", "", ""]);
  });

  it("paste with no clipboard data emits an empty string", async () => {
    const wrapper = factory({ length: 4, modelValue: "12" });
    await wrapper.get("input").trigger("paste", { clipboardData: null });
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([""]);
  });

  it("Backspace on an empty cell focuses the previous cell", async () => {
    const wrapper = factory({ length: 3, modelValue: "1" });
    const cells = wrapper.findAll("input");
    const focus = vi.spyOn(cells[0]!.element as HTMLInputElement, "focus");
    await cells[1]!.trigger("keydown", { key: "Backspace" });
    expect(focus).toHaveBeenCalled();
  });

  it("Backspace on a filled cell or the first empty cell does not steal focus", async () => {
    const wrapper = factory({ length: 3, modelValue: "1" });
    const cells = wrapper.findAll("input");
    const focus = vi.spyOn(cells[0]!.element as HTMLInputElement, "focus");
    await cells[0]!.trigger("keydown", { key: "Backspace" });
    await cells[1]!.trigger("keydown", { key: "Tab" });
    expect(focus).not.toHaveBeenCalled();
  });

  it("syncs digits when modelValue or length changes", async () => {
    const wrapper = factory({ length: 4, modelValue: "12" });
    await wrapper.setProps({ modelValue: "9876" });
    expect(
      wrapper
        .findAll("input")
        .map((c) => (c.element as HTMLInputElement).value),
    ).toEqual(["9", "8", "7", "6"]);

    await wrapper.setProps({ length: 2, modelValue: "9" });
    expect(wrapper.findAll("input")).toHaveLength(2);
  });

  it("does not advance focus from the last cell and Backspace on an empty first cell is a no-op", async () => {
    const wrapper = factory({ length: 2 });
    const cells = wrapper.findAll("input");
    const focus = vi.spyOn(cells[0]!.element as HTMLInputElement, "focus");
    await cells[1]!.setValue("9");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual(["9"]);
    await cells[0]!.trigger("keydown", { key: "Backspace" });
    expect(focus).not.toHaveBeenCalled();
  });

  it("clears a cell without moving focus and unmounts cleanly", async () => {
    const wrapper = factory({ length: 3, modelValue: "12" });
    await wrapper.get("input").setValue("");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual(["2"]);
    wrapper.unmount();
  });

  it("forwards disabled and labelledBy", () => {
    const wrapper = factory({ disabled: true, labelledBy: "otp-label" });
    expect(wrapper.attributes("aria-labelledby")).toBe("otp-label");
    expect(wrapper.get("input").attributes("disabled")).toBe("");
  });
});
