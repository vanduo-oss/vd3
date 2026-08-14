import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdSignUp from "../../src/components/VdSignUp.vue";

const fill = async (
  wrapper: ReturnType<typeof mount>,
  values: {
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
    terms?: boolean;
  },
) => {
  if (values.name !== undefined) {
    await wrapper.find('input[name="name"]').setValue(values.name);
  }
  if (values.email !== undefined) {
    await wrapper.find('input[name="email"]').setValue(values.email);
  }
  if (values.password !== undefined) {
    await wrapper.find('input[name="password"]').setValue(values.password);
  }
  if (values.confirm !== undefined) {
    await wrapper.find('input[name="confirm"]').setValue(values.confirm);
  }
  if (values.terms) {
    await wrapper.find('input[name="terms"]').setValue(true);
  }
};

describe("VdSignUp", () => {
  it("emits submit when the form is valid", async () => {
    const wrapper = mount(VdSignUp);
    await fill(wrapper, {
      name: " Ada Lovelace ",
      email: "ada@example.com",
      password: "secret1",
      confirm: "secret1",
      terms: true,
    });
    await wrapper.get("form").trigger("submit");
    expect(wrapper.emitted("submit")).toEqual([
      [
        {
          name: "Ada Lovelace",
          email: "ada@example.com",
          password: "secret1",
          terms: true,
        },
      ],
    ]);
  });

  it("blocks submit and shows required / email / match messages", async () => {
    const wrapper = mount(VdSignUp);
    await wrapper.get("form").trigger("submit");
    expect(wrapper.emitted("submit")).toBeUndefined();
    expect(wrapper.text()).toContain("This field is required");

    await fill(wrapper, {
      name: "Ada",
      email: "not-an-email",
      password: "a",
      confirm: "b",
    });
    await wrapper.get("form").trigger("submit");
    expect(wrapper.text()).toContain("Please enter a valid email address");
    expect(wrapper.text()).toContain("Fields do not match");
  });

  it("requires terms unless requireTerms is false", async () => {
    const required = mount(VdSignUp);
    await fill(required, {
      name: "Ada",
      email: "ada@example.com",
      password: "x",
      confirm: "x",
    });
    await required.get("form").trigger("submit");
    expect(required.emitted("submit")).toBeUndefined();
    expect(required.text()).toContain("This field is required");

    const optional = mount(VdSignUp, { props: { requireTerms: false } });
    await fill(optional, {
      name: "Ada",
      email: "ada@example.com",
      password: "x",
      confirm: "x",
    });
    await optional.get("form").trigger("submit");
    expect(optional.emitted("submit")).toEqual([
      [{ name: "Ada", email: "ada@example.com", password: "x", terms: false }],
    ]);
  });

  it("uses new-password autocomplete on both password fields", () => {
    const wrapper = mount(VdSignUp);
    expect(
      wrapper.find('input[name="password"]').attributes("autocomplete"),
    ).toBe("new-password");
    expect(
      wrapper.find('input[name="confirm"]').attributes("autocomplete"),
    ).toBe("new-password");
  });

  it("renders error, message, avatar, extra, and links", () => {
    const error = mount(VdSignUp, { props: { error: "Taken" } });
    expect(error.get(".vd-alert-danger").text()).toContain("Taken");

    const message = mount(VdSignUp, { props: { message: "Check email" } });
    expect(message.get(".vd-alert-success").text()).toContain("Check email");

    const branded = mount(VdSignUp, {
      props: { avatarInitials: "AD", avatarSrc: "" },
      slots: {
        extra: '<input type="hidden" name="_csrf" value="tok" />',
        links: '<a href="#in">Sign in</a>',
        brand: '<span id="logo">L</span>',
      },
    });
    expect(branded.get("#logo").text()).toBe("L");
    expect(branded.find('input[name="_csrf"]').exists()).toBe(true);
    expect(branded.get(".vd-auth-links").text()).toBe("Sign in");

    const avatar = mount(VdSignUp, { props: { avatarSrc: "/a.png" } });
    expect(avatar.get(".vd-avatar img").attributes("src")).toBe("/a.png");

    const initials = mount(VdSignUp, { props: { avatarInitials: "AD" } });
    expect(initials.get(".vd-avatar").text()).toContain("AD");
  });

  it("honours loading", () => {
    const wrapper = mount(VdSignUp, { props: { loading: true } });
    expect(wrapper.get('button[type="submit"]').classes()).toContain(
      "is-loading",
    );
  });
});
