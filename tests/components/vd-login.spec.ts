import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdLogin from "../../src/components/VdLogin.vue";

const factory = (
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
) => mount(VdLogin, { props, slots });

describe("VdLogin", () => {
  it("renders email/password autocomplete tokens and a reveal control", () => {
    const wrapper = factory();
    const inputs = wrapper.findAll("input");
    const identifier = inputs.find(
      (i) => i.attributes("name") === "identifier",
    )!;
    const password = inputs.find((i) => i.attributes("name") === "password")!;
    expect(identifier.attributes("type")).toBe("email");
    expect(identifier.attributes("autocomplete")).toBe("email");
    expect(password.attributes("autocomplete")).toBe("current-password");
    expect(password.attributes("type")).toBe("password");
    expect(wrapper.find("button.vd-input-reveal").exists()).toBe(true);
    expect(password.attributes("autocomplete")).not.toBe("off");
  });

  it("emits submit with identifier, password, and remember", async () => {
    const wrapper = factory();
    const identifier = wrapper.find('input[name="identifier"]');
    const password = wrapper.find('input[name="password"]');
    await identifier.setValue("ada@example.com");
    await password.setValue("secret");
    await wrapper.find('input[name="remember"]').setValue(true);
    await wrapper.get("form").trigger("submit");
    expect(wrapper.emitted("submit")).toEqual([
      [{ identifier: "ada@example.com", password: "secret", remember: true }],
    ]);
  });

  it("emits social without submitting the form", async () => {
    const wrapper = factory({
      providers: [{ id: "github", label: "GitHub", icon: "github-logo" }],
    });
    const buttons = wrapper.findAll("button");
    const github = buttons.find((b) => b.text().includes("GitHub"))!;
    await github.trigger("click");
    expect(wrapper.emitted("social")).toEqual([["github"]]);
    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("uses username autocomplete when identifierType is text", () => {
    const wrapper = factory({ identifierType: "text" });
    const identifier = wrapper.find('input[name="identifier"]');
    expect(identifier.attributes("type")).toBe("text");
    expect(identifier.attributes("autocomplete")).toBe("username");
  });

  it("hides remember-me when remember is false", () => {
    const wrapper = factory({ remember: false });
    expect(wrapper.find('input[name="remember"]').exists()).toBe(false);
  });

  it("renders a danger alert for error and a success alert for message", async () => {
    const error = factory({ error: "Locked out" });
    expect(error.get(".vd-alert-danger").text()).toContain("Locked out");

    const message = factory({ message: "Welcome back" });
    expect(message.get(".vd-alert-success").text()).toContain("Welcome back");
  });

  it("renders an avatar in the brand slot when initials are provided", () => {
    const wrapper = factory({ avatarInitials: "AD" });
    expect(wrapper.get(".vd-avatar").text()).toContain("AD");
  });

  it("renders extra, links, and custom brand slots", () => {
    const wrapper = factory(
      {},
      {
        extra: '<input type="hidden" name="_csrf" value="tok" />',
        links: '<a href="#forgot">Forgot</a>',
        brand: '<span id="custom-brand">Logo</span>',
      },
    );
    expect(wrapper.find('input[name="_csrf"]').exists()).toBe(true);
    expect(wrapper.get(".vd-auth-links").text()).toBe("Forgot");
    expect(wrapper.get("#custom-brand").text()).toBe("Logo");
  });

  it("honours loading on the submit button and avatarSrc", () => {
    const wrapper = factory({
      loading: true,
      avatarSrc: "https://example.com/a.png",
    });
    expect(wrapper.get('button[type="submit"]').classes()).toContain(
      "is-loading",
    );
    expect(wrapper.get(".vd-avatar img").attributes("src")).toBe(
      "https://example.com/a.png",
    );
  });

  it("can render unframed", () => {
    const wrapper = factory({ framed: false });
    expect(wrapper.find(".vd-cover").exists()).toBe(false);
  });

  it("renders a provider without an icon", () => {
    const wrapper = factory({
      providers: [{ id: "email", label: "Continue with email" }],
    });
    expect(wrapper.text()).toContain("Continue with email");
    expect(wrapper.find(".vd-auth-social .ph").exists()).toBe(false);
  });
});
