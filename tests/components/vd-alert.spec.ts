import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import VdAlert from "../../src/components/VdAlert.vue";

describe("VdAlert", () => {
  it("renders role=alert with the default info variant and slot content", () => {
    const wrapper = mount(VdAlert, {
      slots: { default: "Something happened" },
    });

    expect(wrapper.attributes("role")).toBe("alert");
    expect(wrapper.classes()).toContain("vd-alert");
    expect(wrapper.classes()).toContain("vd-alert-info");
    expect(wrapper.get(".vd-alert-content").text()).toBe("Something happened");
    // Body wrapper is always present.
    expect(wrapper.find(".vd-alert-body").exists()).toBe(true);
  });

  it.each([
    ["primary", "ph-info"],
    ["secondary", "ph-info"],
    ["success", "ph-check-circle"],
    ["warning", "ph-warning"],
    ["danger", "ph-x-circle"],
    ["info", "ph-info"],
  ] as const)(
    "variant=%s maps to vd-alert-%s and the matching status icon",
    (variant, iconClass) => {
      const wrapper = mount(VdAlert, { props: { variant } });

      expect(wrapper.classes()).toContain(`vd-alert-${variant}`);
      const icon = wrapper.get("i.vd-alert-icon");
      expect(icon.classes()).toContain(iconClass);
      expect(icon.attributes("aria-hidden")).toBe("true");
    },
  );

  it("renders the title paragraph only when title is set", () => {
    const withTitle = mount(VdAlert, {
      props: { title: "Heads up" },
      slots: { default: "Details" },
    });
    expect(withTitle.get("p.vd-alert-title").text()).toBe("Heads up");

    const withoutTitle = mount(VdAlert, { slots: { default: "Details" } });
    expect(withoutTitle.find(".vd-alert-title").exists()).toBe(false);
  });

  it("is not dismissible by default", () => {
    const wrapper = mount(VdAlert);
    expect(wrapper.find(".vd-alert-dismiss").exists()).toBe(false);
  });

  it("dismissible renders a labelled dismiss button that emits dismiss on click", async () => {
    const wrapper = mount(VdAlert, { props: { dismissible: true } });

    const dismiss = wrapper.get("button.vd-alert-dismiss");
    expect(dismiss.attributes("type")).toBe("button");
    expect(dismiss.attributes("aria-label")).toBe("Dismiss");
    // Dismiss button carries the phosphor x icon.
    expect(dismiss.find("i.ph-x").exists()).toBe(true);

    await dismiss.trigger("click");
    expect(wrapper.emitted("dismiss")).toHaveLength(1);
    expect(wrapper.emitted("dismiss")?.[0]).toEqual([]);
  });

  it("plays WAAPI exit animation when animate is available", async () => {
    let onFinishCallback: (() => void) | undefined;
    const animateMock = vi.fn().mockImplementation(() => {
      const anim = {
        set onfinish(cb: () => void) {
          onFinishCallback = cb;
        },
        set oncancel(_cb: () => void) {
          // noop
        },
      };
      return anim;
    });

    const wrapper = mount(VdAlert, {
      props: { dismissible: true, animated: true },
    });

    wrapper.element.animate =
      animateMock as unknown as typeof Element.prototype.animate;

    const dismiss = wrapper.get("button.vd-alert-dismiss");
    await dismiss.trigger("click");

    expect(wrapper.classes()).toContain("is-dismissing");
    expect(animateMock).toHaveBeenCalledTimes(1);
    // dismiss not emitted until onfinish fires
    expect(wrapper.emitted("dismiss")).toBeUndefined();

    onFinishCallback?.();
    expect(wrapper.emitted("dismiss")).toHaveLength(1);
  });

  it("emits dismiss immediately when animated is false", async () => {
    const wrapper = mount(VdAlert, {
      props: { dismissible: true, animated: false },
    });

    await wrapper.get("button.vd-alert-dismiss").trigger("click");
    expect(wrapper.emitted("dismiss")).toHaveLength(1);
  });
});
