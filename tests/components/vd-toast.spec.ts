import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import VdToast from "../../src/components/VdToast.vue";
import type { ToastEntry } from "../../src/composables/useToast";

/**
 * VdToast schedules its enter transition on `requestAnimationFrame` and (for
 * timed toasts) an auto-dismiss `setTimeout`. rAF is stubbed to run
 * synchronously so `is-visible` is deterministic; `duration: 0` is used
 * wherever a timer would otherwise be scheduled, and every mount is unmounted
 * so `onBeforeUnmount` clears any pending timers.
 */
const entry = (over: Partial<ToastEntry> = {}): ToastEntry => ({
  id: "t1",
  message: "Saved",
  duration: 0,
  position: "top-right",
  dismissible: true,
  showProgress: false,
  solid: false,
  ...over,
});

describe("VdToast", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback): number => {
        cb(0);
        return 0;
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a .vd-toast polite status region with the message", () => {
    const wrapper = mount(VdToast, { props: { toast: entry() } });
    expect(wrapper.classes()).toContain("vd-toast");
    expect(wrapper.attributes("role")).toBe("status");
    expect(wrapper.attributes("aria-live")).toBe("polite");
    expect(wrapper.get(".vd-toast-message").text()).toBe("Saved");
    wrapper.unmount();
  });

  it("becomes visible on the mount animation frame", async () => {
    const wrapper = mount(VdToast, { props: { toast: entry() } });
    // The rAF stub flips the reactive `visible` ref synchronously; the class
    // it drives lands after the reactivity flush.
    await nextTick();
    expect(wrapper.classes()).toContain("is-visible");
    wrapper.unmount();
  });

  it("maps the entry type to the modifier class and renders its icon + title", () => {
    const wrapper = mount(VdToast, {
      props: { toast: entry({ type: "success", title: "Done" }) },
    });
    expect(wrapper.classes()).toContain("vd-toast-success");
    expect(wrapper.get(".vd-toast-title").text()).toBe("Done");
    expect(wrapper.find(".vd-toast-icon").exists()).toBe(true);
    wrapper.unmount();
  });

  it("omits the icon when the entry has no type", () => {
    const wrapper = mount(VdToast, { props: { toast: entry() } });
    expect(wrapper.find(".vd-toast-icon").exists()).toBe(false);
    wrapper.unmount();
  });

  it("adds the solid modifier when solid is set", () => {
    const wrapper = mount(VdToast, {
      props: { toast: entry({ solid: true }) },
    });
    expect(wrapper.classes()).toContain("vd-toast-solid");
    wrapper.unmount();
  });

  it("renders the progress bar and with-progress class only when showProgress and duration>0", () => {
    const off = mount(VdToast, {
      props: { toast: entry({ showProgress: true, duration: 0 }) },
    });
    expect(off.classes()).not.toContain("vd-toast-with-progress");
    expect(off.find(".vd-toast-progress").exists()).toBe(false);
    off.unmount();

    const on = mount(VdToast, {
      props: { toast: entry({ showProgress: true, duration: 5000 }) },
    });
    expect(on.classes()).toContain("vd-toast-with-progress");
    expect(on.get(".vd-toast-progress").attributes("style")).toContain(
      "5000ms",
    );
    on.unmount();
  });

  it("renders the dismiss button only when the entry is dismissible", () => {
    const on = mount(VdToast, {
      props: { toast: entry({ dismissible: true }) },
    });
    expect(on.find(".vd-toast-close").exists()).toBe(true);
    on.unmount();

    const off = mount(VdToast, {
      props: { toast: entry({ dismissible: false }) },
    });
    expect(off.find(".vd-toast-close").exists()).toBe(false);
    off.unmount();
  });

  it("emits dismiss only after the exit transition completes when closed", async () => {
    const wrapper = mount(VdToast, { props: { toast: entry({ id: "abc" }) } });
    await wrapper.get(".vd-toast-close").trigger("click");
    expect(wrapper.classes()).toContain("is-exiting");
    expect(wrapper.classes()).not.toContain("is-visible");
    expect(wrapper.emitted("dismiss")).toBeUndefined();

    await wrapper.trigger("transitionend");
    expect(wrapper.emitted("dismiss")).toEqual([["abc"]]);
    wrapper.unmount();
  });
});
