import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useFocusTrap } from "../../src/composables/useFocusTrap";

// useFocusTrap uses onMounted/onUnmounted and reads document.activeElement,
// so the host is attached to the document for real focus behaviour.
type Trap = ReturnType<typeof useFocusTrap>;

let active: VueWrapper | null = null;

const mountTrap = (focusable: boolean): { wrapper: VueWrapper; trap: Trap } => {
  let captured!: Trap;
  const Comp = defineComponent({
    setup() {
      const container = ref<HTMLElement | null>(null);
      captured = useFocusTrap(container);
      return () =>
        h(
          "div",
          { ref: container },
          focusable
            ? [
                h("button", { class: "b1" }, "one"),
                h("input", { class: "b2" }),
                h("button", { class: "b3" }, "three"),
              ]
            : [h("span", "nothing focusable")],
        );
    },
  });
  const wrapper = mount(Comp, { attachTo: document.body });
  active = wrapper;
  return { wrapper, trap: captured };
};

const el = (wrapper: VueWrapper, sel: string): HTMLElement =>
  wrapper.get(sel).element as HTMLElement;

const tab = (shift = false): boolean =>
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Tab",
      cancelable: true,
      shiftKey: shift,
    }),
  );

afterEach(() => {
  if (active) {
    active.unmount();
    active = null;
  }
  vi.restoreAllMocks();
});

describe("useFocusTrap", () => {
  it("starts inactive and toggles the active ref via activate/deactivate", () => {
    const { trap } = mountTrap(true);
    expect(trap.active.value).toBe(false);
    trap.activate();
    expect(trap.active.value).toBe(true);
    trap.deactivate();
    expect(trap.active.value).toBe(false);
  });

  it("focuses the first focusable element on activate()", () => {
    const { wrapper, trap } = mountTrap(true);
    trap.activate();
    expect(document.activeElement).toBe(el(wrapper, ".b1"));
  });

  it("wraps focus from the last element back to the first on Tab", () => {
    const { wrapper, trap } = mountTrap(true);
    trap.activate();
    el(wrapper, ".b3").focus();
    expect(tab()).toBe(false); // preventDefault
    expect(document.activeElement).toBe(el(wrapper, ".b1"));
  });

  it("wraps focus from the first element to the last on Shift+Tab", () => {
    const { wrapper, trap } = mountTrap(true);
    trap.activate();
    el(wrapper, ".b1").focus();
    expect(tab(true)).toBe(false);
    expect(document.activeElement).toBe(el(wrapper, ".b3"));
  });

  it("does not wrap or preventDefault when focus is on a middle element", () => {
    const { wrapper, trap } = mountTrap(true);
    trap.activate();
    el(wrapper, ".b2").focus();
    expect(tab()).toBe(true); // not prevented
    expect(document.activeElement).toBe(el(wrapper, ".b2"));
  });

  it("ignores Tab while inactive", () => {
    const { wrapper, trap } = mountTrap(true);
    el(wrapper, ".b2").focus();
    // never activated
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(el(wrapper, ".b2"));
    // and after deactivate()
    trap.activate();
    trap.deactivate();
    el(wrapper, ".b2").focus();
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(el(wrapper, ".b2"));
  });

  it("ignores non-Tab keys entirely", () => {
    const { wrapper, trap } = mountTrap(true);
    trap.activate();
    el(wrapper, ".b3").focus();
    const prevented = window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", cancelable: true }),
    );
    expect(prevented).toBe(true);
    expect(document.activeElement).toBe(el(wrapper, ".b3"));
  });

  it("preventDefaults Tab but does nothing when there are no focusable elements", () => {
    const { trap } = mountTrap(false);
    trap.activate();
    expect(trap.active.value).toBe(true);
    expect(tab()).toBe(false); // preventDefault, no focus target
  });

  it("removes the window keydown listener on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const { wrapper } = mountTrap(true);
    const call = addSpy.mock.calls.find((c) => c[0] === "keydown");
    const handler = call?.[1];
    expect(handler).toBeTypeOf("function");

    const removeSpy = vi.spyOn(window, "removeEventListener");
    wrapper.unmount();
    active = null;
    expect(removeSpy).toHaveBeenCalledWith("keydown", handler);

    // After unmount the trap no longer reacts to Tab.
    expect(tab()).toBe(true);
  });
});
