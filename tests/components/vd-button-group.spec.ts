import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdButtonGroup from "../../src/components/VdButtonGroup.vue";
import VdButton from "../../src/components/VdButton.vue";

describe("VdButtonGroup", () => {
  it("renders a div.vd-btn-group with role=group and md default size", () => {
    const wrapper = mount(VdButtonGroup, {
      slots: { default: "<button>One</button>" },
    });

    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.attributes("role")).toBe("group");
    expect(wrapper.classes()).toContain("vd-btn-group");
    expect(wrapper.classes()).toContain("vd-btn-group-md");
    expect(wrapper.classes()).not.toContain("vd-btn-group-vertical");
    expect(wrapper.classes()).not.toContain("vd-btn-group-full");
  });

  it.each(["sm", "md", "lg"] as const)(
    "size=%s maps to vd-btn-group-%s",
    (size) => {
      const wrapper = mount(VdButtonGroup, { props: { size } });
      expect(wrapper.classes()).toContain(`vd-btn-group-${size}`);
    },
  );

  it("vertical adds vd-btn-group-vertical", () => {
    const wrapper = mount(VdButtonGroup, { props: { vertical: true } });
    expect(wrapper.classes()).toContain("vd-btn-group-vertical");
  });

  it("fullWidth adds vd-btn-group-full", () => {
    const wrapper = mount(VdButtonGroup, { props: { fullWidth: true } });
    expect(wrapper.classes()).toContain("vd-btn-group-full");
  });

  it("renders slotted VdButtons inside the group", () => {
    const wrapper = mount(VdButtonGroup, {
      slots: {
        default: [
          '<button class="vd-btn vd-btn-primary">Left</button>',
          '<button class="vd-btn vd-btn-secondary">Right</button>',
        ].join(""),
      },
    });

    const buttons = wrapper.findAll("button.vd-btn");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].text()).toBe("Left");
    expect(buttons[1].text()).toBe("Right");
  });

  it("composes with mounted VdButton components", () => {
    const wrapper = mount(VdButtonGroup, {
      props: { size: "sm" },
      slots: {
        default:
          '<VdButton variant="secondary">A</VdButton>' +
          '<VdButton variant="danger">B</VdButton>',
      },
      global: { components: { VdButton } },
    });

    expect(wrapper.classes()).toContain("vd-btn-group-sm");
    const buttons = wrapper.findAllComponents(VdButton);
    expect(buttons).toHaveLength(2);
    expect(buttons[0].classes()).toContain("vd-btn-secondary");
    expect(buttons[1].classes()).toContain("vd-btn-danger");
  });
});
