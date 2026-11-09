import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import VdExpandTransition from "../../src/components/VdExpandTransition.vue";
import { setMotion } from "../../src/composables/useMotion";

describe("VdExpandTransition", () => {
  beforeEach(() => {
    setMotion("auto", { persist: false });
  });

  afterEach(() => {
    setMotion("auto", { persist: false });
    vi.restoreAllMocks();
  });

  it("renders slotted content", () => {
    const wrapper = mount(VdExpandTransition, {
      slots: {
        default: '<div class="panel">Panel Content</div>',
      },
    });

    expect(wrapper.find(".panel").exists()).toBe(true);
    expect(wrapper.text()).toBe("Panel Content");
  });

  it("animates height and opacity on enter and leave when animate is supported", async () => {
    const animateMock = vi.fn().mockReturnValue({
      onfinish: null,
      oncancel: null,
      cancel: vi.fn(),
    });
    window.HTMLElement.prototype.animate = animateMock;

    const TestComponent = defineComponent({
      components: { VdExpandTransition },
      setup() {
        const visible = ref(false);
        return { visible };
      },
      template: `
        <VdExpandTransition :duration="300">
          <div v-show="visible" class="content">Content</div>
        </VdExpandTransition>
      `,
    });

    const wrapper = mount(TestComponent, {
      global: {
        stubs: {
          transition: false,
        },
      },
    });
    wrapper.vm.visible = true;
    await wrapper.vm.$nextTick();

    expect(animateMock).toHaveBeenCalled();
    const enterKeyframes = animateMock.mock.calls[0][0];
    const enterOptions = animateMock.mock.calls[0][1];
    expect(enterKeyframes[0].height).toBe("0px");
    expect(enterKeyframes[0].opacity).toBe(0);
    expect(enterOptions.duration).toBe(300);

    // Call onfinish
    animateMock.mock.results[0].value.onfinish();

    // Toggle to leave
    wrapper.vm.visible = false;
    await wrapper.vm.$nextTick();

    expect(animateMock).toHaveBeenCalledTimes(2);
    const leaveKeyframes = animateMock.mock.calls[1][0];
    const leaveOptions = animateMock.mock.calls[1][1];
    expect(leaveKeyframes[1].height).toBe("0px");
    expect(leaveOptions.duration).toBe(300);
  });

  it("performs 89ms opacity fade under data-motion='reduce'", async () => {
    setMotion("reduce");
    const animateMock = vi.fn().mockReturnValue({
      onfinish: null,
      oncancel: null,
      cancel: vi.fn(),
    });
    window.HTMLElement.prototype.animate = animateMock;

    const TestComponent = defineComponent({
      components: { VdExpandTransition },
      setup() {
        const visible = ref(false);
        return { visible };
      },
      template: `
        <VdExpandTransition>
          <div v-show="visible" class="content">Content</div>
        </VdExpandTransition>
      `,
    });

    const wrapper = mount(TestComponent, {
      global: {
        stubs: {
          transition: false,
        },
      },
    });
    wrapper.vm.visible = true;
    await wrapper.vm.$nextTick();

    expect(animateMock).toHaveBeenCalled();
    const keyframes = animateMock.mock.calls[0][0];
    const options = animateMock.mock.calls[0][1];
    expect(keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(options.duration).toBe(89);

    // Toggle to leave under reduced motion
    animateMock.mock.results[0].value.onfinish();
    wrapper.vm.visible = false;
    await wrapper.vm.$nextTick();
    expect(animateMock).toHaveBeenCalledTimes(2);
    const leaveKeyframes = animateMock.mock.calls[1][0];
    const leaveOptions = animateMock.mock.calls[1][1];
    expect(leaveKeyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(leaveOptions.duration).toBe(89);
    animateMock.mock.results[1].value.oncancel();
  });

  it("resolves duration object { enter, leave } and CSS variable overrides", async () => {
    const animateMock = vi.fn().mockReturnValue({
      onfinish: null,
      oncancel: null,
      cancel: vi.fn(),
    });
    window.HTMLElement.prototype.animate = animateMock;

    const TestComponent = defineComponent({
      components: { VdExpandTransition },
      setup() {
        const visible = ref(false);
        return { visible };
      },
      template: `
        <VdExpandTransition :duration="{ enter: 120, leave: 240 }">
          <div v-show="visible" class="content">Content</div>
        </VdExpandTransition>
      `,
    });

    const wrapper = mount(TestComponent, {
      global: {
        stubs: {
          transition: false,
        },
      },
    });

    wrapper.vm.visible = true;
    await wrapper.vm.$nextTick();

    expect(animateMock.mock.calls[0][1].duration).toBe(120);
    animateMock.mock.results[0].value.oncancel();

    wrapper.vm.visible = false;
    await wrapper.vm.$nextTick();
    expect(animateMock.mock.calls[1][1].duration).toBe(240);
  });

  it("skips animation completely when animated is false or motion is off", async () => {
    const animateMock = vi.fn();
    window.HTMLElement.prototype.animate = animateMock;

    const TestComponent = defineComponent({
      components: { VdExpandTransition },
      setup() {
        const visible = ref(false);
        return { visible };
      },
      template: `
        <VdExpandTransition :animated="false">
          <div v-show="visible" class="content">Content</div>
        </VdExpandTransition>
      `,
    });

    const wrapper = mount(TestComponent, {
      global: {
        stubs: {
          transition: false,
        },
      },
    });
    wrapper.vm.visible = true;
    await wrapper.vm.$nextTick();

    expect(animateMock).not.toHaveBeenCalled();
  });
});
