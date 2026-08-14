import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdForgotPassword from "../../src/components/VdForgotPassword.vue";

describe("VdForgotPassword", () => {
  it("emits the email on submit with email autocomplete", async () => {
    const wrapper = mount(VdForgotPassword);
    const input = wrapper.find('input[name="email"]');
    expect(input.attributes("type")).toBe("email");
    expect(input.attributes("autocomplete")).toBe("email");
    await input.setValue("ada@example.com");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.emitted("submit")).toEqual([[{ email: "ada@example.com" }]]);
  });

  it("renders error, message, extra, links, brand, and loading", () => {
    const error = mount(VdForgotPassword, { props: { error: "Unknown" } });
    expect(error.get(".vd-alert-danger").text()).toContain("Unknown");

    const message = mount(VdForgotPassword, {
      props: { message: "Sent", loading: true },
      slots: {
        extra: '<input type="hidden" name="_csrf" value="tok" />',
        links: '<a href="#in">Sign in</a>',
        brand: '<span id="logo">L</span>',
      },
    });
    expect(message.get(".vd-alert-success").text()).toContain("Sent");
    expect(message.find('input[name="_csrf"]').exists()).toBe(true);
    expect(message.get(".vd-auth-links").text()).toBe("Sign in");
    expect(message.get("#logo").text()).toBe("L");
    expect(message.get('button[type="submit"]').classes()).toContain(
      "is-loading",
    );
  });
});
