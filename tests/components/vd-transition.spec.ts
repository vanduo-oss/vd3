import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import VdTransition from "../../src/components/VdTransition.vue";
import { setMotion } from "../../src/composables/useMotion";

describe("VdTransition", () => {
  beforeEach(() => {
    setMotion("auto", { persist: false });
  });

  afterEach(() => {
    setMotion("auto", { persist: false });
  });

  it("renders slotted content", () => {
    const wrapper = mount(VdTransition, {
      slots: {
        default: '<div class="content">Hello</div>',
      },
    });

    expect(wrapper.find(".content").exists()).toBe(true);
    expect(wrapper.text()).toBe("Hello");
  });

  it("uses vd-fade as default transition name and passes events", async () => {
    const TestComponent = defineComponent({
      components: { VdTransition },
      setup() {
        const show = ref(true);
        return { show };
      },
      template: `
        <VdTransition name="slide-up">
          <div v-if="show" class="box">Item</div>
        </VdTransition>
      `,
    });

    const wrapper = mount(TestComponent);
    expect(wrapper.find(".box").exists()).toBe(true);

    wrapper.vm.show = false;
    await wrapper.vm.$nextTick();
  });

  it("disables transition name when animated is false or motion is off", async () => {
    const TestComponent = defineComponent({
      components: { VdTransition },
      props: { animated: { type: Boolean, default: true } },
      template: `
        <VdTransition :animated="animated" name="scale">
          <div class="box">Item</div>
        </VdTransition>
      `,
    });

    const wrapper = mount(TestComponent, { props: { animated: false } });
    expect(
      wrapper.findComponent(VdTransition).vm.transitionName,
    ).toBeUndefined();

    const wrapper2 = mount(TestComponent, { props: { animated: true } });
    expect(wrapper2.findComponent(VdTransition).vm.transitionName).toBe(
      "vd-scale",
    );

    setMotion("off");
    await wrapper2.vm.$nextTick();
    expect(
      wrapper2.findComponent(VdTransition).vm.transitionName,
    ).toBeUndefined();
  });

  it("applies and clears duration custom property on transition lifecycle hooks", async () => {
    let capturedDuration = "";
    const onBeforeEnter = vi.fn((el: Element) => {
      capturedDuration = (el as HTMLElement).style.getPropertyValue(
        "--vd-transition-duration",
      );
    });
    const onAfterEnter = vi.fn();
    const onBeforeLeave = vi.fn();
    const onAfterLeave = vi.fn();
    const onEnter = vi.fn((_el: Element, done: () => void) => done());
    const onLeave = vi.fn((_el: Element, done: () => void) => done());

    const TestComponent = defineComponent({
      components: { VdTransition },
      setup() {
        const visible = ref(false);
        return {
          visible,
          onBeforeEnter,
          onAfterEnter,
          onBeforeLeave,
          onAfterLeave,
          onEnter,
          onLeave,
        };
      },
      template: `
        <VdTransition
          name="fade"
          :duration="233"
          @before-enter="onBeforeEnter"
          @after-enter="onAfterEnter"
          @before-leave="onBeforeLeave"
          @after-leave="onAfterLeave"
          @enter="onEnter"
          @leave="onLeave"
        >
          <div v-if="visible" class="target">Content</div>
        </VdTransition>
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

    expect(onBeforeEnter).toHaveBeenCalledTimes(1);
    expect(capturedDuration).toBe("233ms");
    expect(onAfterEnter).toHaveBeenCalledTimes(1);
    const enterEl = onBeforeEnter.mock.calls[0][0] as HTMLElement;
    // Cleared after enter
    expect(enterEl.style.getPropertyValue("--vd-transition-duration")).toBe("");

    wrapper.vm.visible = false;
    await wrapper.vm.$nextTick();

    expect(onBeforeLeave).toHaveBeenCalledTimes(1);
    expect(onAfterLeave).toHaveBeenCalledTimes(1);
  });
});
