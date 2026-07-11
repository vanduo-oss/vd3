import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useClickOutside } from "../../src/composables/useClickOutside";

/**
 * useClickOutside carries the vd2 signature intact: a capture-phase
 * `pointerdown` listener attached one macrotask after `enabled` flips true, and
 * always detached on disable or unmount. These specs drive a tiny host
 * component so the composable runs inside a real setup/lifecycle scope.
 */

/** Resolve after the deferred (setTimeout 0) attach has run. */
const settle = async (): Promise<void> => {
  await nextTick();
  await new Promise((r) => setTimeout(r, 0));
};

/** A pointerdown originating from `el`, seen by the capture listener on document. */
const pointerDownFrom = (el: Element): void => {
  el.dispatchEvent(new Event("pointerdown", { bubbles: true }));
};

let wrapper: VueWrapper | null = null;

function mountHost(handler: () => void) {
  const enabled = ref(false);
  wrapper = mount(
    defineComponent({
      setup() {
        const inside = ref<HTMLElement | null>(null);
        useClickOutside([inside], handler, enabled);
        return { inside };
      },
      template: `<div class="host"><div ref="inside" class="inside">in</div></div>`,
    }),
    { attachTo: document.body },
  );
  const insideEl = wrapper.get(".inside").element;
  return { enabled, insideEl };
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

describe("useClickOutside", () => {
  it("fires the handler on an outside pointerdown once enabled", async () => {
    const handler = vi.fn();
    const { enabled } = mountHost(handler);

    enabled.value = true;
    await settle();

    pointerDownFrom(document.body);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignores a pointerdown inside one of the refs", async () => {
    const handler = vi.fn();
    const { enabled, insideEl } = mountHost(handler);

    enabled.value = true;
    await settle();

    pointerDownFrom(insideEl);
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not fire before enabled flips true (no listener attached)", async () => {
    const handler = vi.fn();
    mountHost(handler);

    // Never enabled — the deferred attach never runs.
    await settle();
    pointerDownFrom(document.body);
    expect(handler).not.toHaveBeenCalled();
  });

  it("detaches when enabled flips back to false", async () => {
    const handler = vi.fn();
    const { enabled } = mountHost(handler);

    enabled.value = true;
    await settle();
    enabled.value = false;
    await nextTick();

    pointerDownFrom(document.body);
    expect(handler).not.toHaveBeenCalled();
  });

  it("detaches on unmount", async () => {
    const handler = vi.fn();
    const { enabled } = mountHost(handler);

    enabled.value = true;
    await settle();
    wrapper?.unmount();
    wrapper = null;

    pointerDownFrom(document.body);
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not re-fire the opening click (deferred attach)", async () => {
    const handler = vi.fn();
    const { enabled } = mountHost(handler);

    // Flip enabled and fire an outside pointerdown in the SAME tick, before the
    // deferred attach — it must be ignored.
    enabled.value = true;
    pointerDownFrom(document.body);
    expect(handler).not.toHaveBeenCalled();

    // After the macrotask, the listener is live.
    await settle();
    pointerDownFrom(document.body);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
