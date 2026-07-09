import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import VdToastContainer from "../../src/components/VdToastContainer.vue";
import { useToastStore } from "../../src/composables/useToast";

// The toast queue is a module-scope singleton; every test starts from an
// empty queue. `requestAnimationFrame` is stubbed to run synchronously so
// VdToast's enter frame (`is-visible`) is deterministic. All toasts are shown
// with `duration: 0` so no auto-dismiss timer is ever scheduled.
const store = useToastStore();

const mountContainer = (): VueWrapper =>
  mount(VdToastContainer, {
    global: { stubs: { teleport: true } },
  });

describe("VdToastContainer", () => {
  beforeEach(() => {
    store.queue.splice(0, store.queue.length);
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

  it("renders no container when the queue is empty", () => {
    const wrapper = mountContainer();
    expect(wrapper.find(".vd-toast-container").exists()).toBe(false);
    wrapper.unmount();
  });

  it("renders one positioned container per position that has toasts", async () => {
    const wrapper = mountContainer();
    store.show({ message: "one", duration: 0 });
    store.show({ message: "two", duration: 0 });
    store.show({ message: "three", duration: 0, position: "bottom-center" });
    await nextTick();

    const containers = wrapper.findAll(".vd-toast-container");
    expect(containers).toHaveLength(2);
    expect(containers[0].classes()).toContain("vd-toast-container-top-right");
    expect(containers[1].classes()).toContain(
      "vd-toast-container-bottom-center",
    );
    expect(containers[0].findAll(".vd-toast")).toHaveLength(2);
    expect(containers[1].findAll(".vd-toast")).toHaveLength(1);
    wrapper.unmount();
  });

  it("sets the polite live-region a11y attributes on each container", async () => {
    const wrapper = mountContainer();
    store.show({ message: "hi", duration: 0 });
    await nextTick();

    const container = wrapper.get(".vd-toast-container");
    expect(container.attributes("role")).toBe("status");
    expect(container.attributes("aria-live")).toBe("polite");
    expect(container.attributes("aria-atomic")).toBe("false");
    wrapper.unmount();
  });

  it("renders toast content, type class, and dismiss button from the entry", async () => {
    const wrapper = mountContainer();
    store.success("saved", { title: "Done", duration: 0 });
    await nextTick();

    const toast = wrapper.get(".vd-toast");
    expect(toast.classes()).toContain("vd-toast-success");
    expect(toast.get(".vd-toast-title").text()).toBe("Done");
    expect(toast.get(".vd-toast-message").text()).toBe("saved");
    expect(toast.find(".vd-toast-icon").exists()).toBe(true);
    expect(toast.get(".vd-toast-close").attributes("aria-label")).toBe("Close");
    wrapper.unmount();
  });

  it("removes the toast from the queue when the close flow completes", async () => {
    const wrapper = mountContainer();
    store.show({ message: "bye", duration: 0 });
    await nextTick();

    await wrapper.get(".vd-toast-close").trigger("click");
    const toast = wrapper.get(".vd-toast");
    expect(toast.classes()).toContain("is-exiting");
    expect(toast.classes()).not.toContain("is-visible");

    // The exit transition ends -> VdToast emits dismiss -> store removes it.
    await toast.trigger("transitionend");
    expect(store.queue).toHaveLength(0);
    expect(wrapper.find(".vd-toast-container").exists()).toBe(false);
    wrapper.unmount();
  });

  it("reactively drops a container when store.dismiss() empties its group", async () => {
    const wrapper = mountContainer();
    const id = store.show({ message: "gone", duration: 0 });
    await nextTick();
    expect(wrapper.find(".vd-toast-container").exists()).toBe(true);

    store.dismiss(id);
    await nextTick();
    expect(wrapper.find(".vd-toast-container").exists()).toBe(false);
    wrapper.unmount();
  });
});
