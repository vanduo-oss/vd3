import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdAuthCard from "../../src/components/VdAuthCard.vue";

describe("VdAuthCard", () => {
  it("renders a glass card inside a cover by default", () => {
    const wrapper = mount(VdAuthCard, { props: { title: "Sign in" } });
    expect(wrapper.get(".vd-cover")).toBeTruthy();
    expect(wrapper.get(".vd-center")).toBeTruthy();
    expect(wrapper.get(".vd-card").classes()).toContain("vd-card-glass");
    expect(wrapper.get(".vd-card").classes()).toContain("vd-card-elevated");
    expect(wrapper.get(".vd-auth-heading").text()).toBe("Sign in");
  });

  it("omits the cover shell when framed is false", () => {
    const wrapper = mount(VdAuthCard, {
      props: { framed: false, title: "Inside" },
    });
    expect(wrapper.find(".vd-cover").exists()).toBe(false);
    expect(wrapper.classes()).toContain("vd-auth");
    expect(wrapper.get(".vd-auth-heading").text()).toBe("Inside");
  });

  it("renders brand, title, alert, default, and footer slots", () => {
    const framed = mount(VdAuthCard, {
      slots: {
        brand: "<span id='b'>B</span>",
        title: "<span id='t'>T</span>",
        alert: "<span id='a'>A</span>",
        default: "<span id='d'>D</span>",
        footer: "<span id='f'>F</span>",
      },
    });
    expect(framed.get("#b").text()).toBe("B");
    expect(framed.get("#t").text()).toBe("T");
    expect(framed.get("#a").text()).toBe("A");
    expect(framed.get("#d").text()).toBe("D");
    expect(framed.get("#f").text()).toBe("F");

    const bare = mount(VdAuthCard, {
      props: { framed: false },
      slots: {
        brand: "<span id='b'>B</span>",
        title: "<span id='t'>T</span>",
        alert: "<span id='a'>A</span>",
        default: "<span id='d'>D</span>",
        footer: "<span id='f'>F</span>",
      },
    });
    expect(bare.get("#b").text()).toBe("B");
    expect(bare.get("#t").text()).toBe("T");
    expect(bare.get("#a").text()).toBe("A");
    expect(bare.get("#d").text()).toBe("D");
    expect(bare.get("#f").text()).toBe("F");
  });

  it("can drop glass and elevation", () => {
    const wrapper = mount(VdAuthCard, {
      props: { glass: false, elevated: false },
    });
    expect(wrapper.get(".vd-card").classes()).not.toContain("vd-card-glass");
    expect(wrapper.get(".vd-card").classes()).not.toContain("vd-card-elevated");
  });

  it("unframed without a title omits the heading", () => {
    const wrapper = mount(VdAuthCard, { props: { framed: false } });
    expect(wrapper.find(".vd-auth-heading").exists()).toBe(false);
  });
});
