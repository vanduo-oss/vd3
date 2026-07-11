import { afterEach, describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import {
  useValidate,
  type UseValidateOptions,
  type UseValidateReturn,
} from "../../src/composables/useValidate";

// Each composable runs in a component scope: mount a host whose root ref is
// handed to the composable, with the fixture markup injected as innerHTML so
// the composable's onMounted `querySelectorAll` scan sees real DOM.
const mounted: VueWrapper[] = [];

function mountHost(
  html: string,
  options?: UseValidateOptions,
): { wrapper: VueWrapper; api: UseValidateReturn } {
  let api!: UseValidateReturn;
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = useValidate(root, options);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, api };
}

// Root-as-form variant: the vanilla queryAll includes the root itself.
function mountFormHost(fieldsHtml: string): {
  wrapper: VueWrapper;
  api: UseValidateReturn;
} {
  let api!: UseValidateReturn;
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = useValidate(root);
      return () =>
        h("form", {
          ref: root,
          class: "vd-validate",
          innerHTML: fieldsHtml,
        });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, api };
}

const blur = (el: Element): void =>
  void el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

const type = (el: HTMLInputElement, value: string): void => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

const submit = (form: Element): Event => {
  const ev = new Event("submit", { bubbles: true, cancelable: true });
  form.dispatchEvent(ev);
  return ev;
};

const errorEl = (scope: Element): HTMLElement | null =>
  scope.querySelector<HTMLElement>(".vd-validate-error");

afterEach(() => {
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted by the test under test */
    }
  }
  mounted.length = 0;
});

describe("useValidate", () => {
  it("marks a required field invalid on blur: classes, aria, role=alert error", () => {
    const { wrapper, api } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="email" data-vd-rules="required|email" />
        </div>
      </form>`);
    const field = wrapper.get<HTMLInputElement>("input").element;

    blur(field);

    expect(field.classList.contains("is-invalid")).toBe(true);
    expect(field.getAttribute("aria-invalid")).toBe("true");
    const err = errorEl(wrapper.element)!;
    expect(err).not.toBeNull();
    expect(err.getAttribute("role")).toBe("alert");
    expect(err.textContent).toBe("This field is required");
    expect(field.getAttribute("aria-describedby")).toBe(err.id);
    expect(err.id.startsWith("vd-err-")).toBe(true);
    expect(api.errors["email"]).toBe("This field is required");
  });

  it("first failing rule wins, and blur mode revalidates on input once marked", () => {
    const { wrapper, api } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="email" data-vd-rules="required|email" />
        </div>
      </form>`);
    const field = wrapper.get<HTMLInputElement>("input").element;

    // Typing before any blur does not validate (blur mode).
    type(field, "not-an-email");
    expect(field.classList.contains("is-invalid")).toBe(false);

    blur(field);
    expect(errorEl(wrapper.element)!.textContent).toBe(
      "Please enter a valid email address",
    );

    // Once marked, input revalidates immediately (vanilla inputClear).
    type(field, "a@b.co");
    expect(field.classList.contains("is-invalid")).toBe(false);
    expect(field.classList.contains("is-valid")).toBe(true);
    expect(field.hasAttribute("aria-invalid")).toBe(false);
    expect(errorEl(wrapper.element)!.style.display).toBe("none");
    expect(api.errors["email"]).toBeUndefined();
  });

  it("clears to the neutral state when a passing field is emptied", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="nick" data-vd-rules="max:5" value="toolong" />
        </div>
      </form>`);
    const field = wrapper.get<HTMLInputElement>("input").element;

    blur(field);
    expect(field.classList.contains("is-invalid")).toBe(true);

    type(field, "");
    expect(field.classList.contains("is-invalid")).toBe(false);
    expect(field.classList.contains("is-valid")).toBe(false);
    expect(field.hasAttribute("aria-invalid")).toBe(false);
    expect(errorEl(wrapper.element)!.style.display).toBe("none");
  });

  it("reuses a single error element across repeated failures", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="a" data-vd-rules="required" />
        </div>
      </form>`);
    const field = wrapper.get<HTMLInputElement>("input").element;

    blur(field);
    blur(field);

    expect(wrapper.element.querySelectorAll(".vd-validate-error")).toHaveLength(
      1,
    );
  });

  it("substitutes {0} with the rule parameter", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="a" data-vd-rules="min:5" value="abc" />
        </div>
      </form>`);

    blur(wrapper.get("input").element);

    expect(errorEl(wrapper.element)!.textContent).toBe(
      "Minimum 5 characters required",
    );
  });

  it("prefers data-vd-msg-<rule> custom messages", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input
            name="a"
            data-vd-rules="required"
            data-vd-msg-required="Need this!" />
        </div>
      </form>`);

    blur(wrapper.get("input").element);

    expect(errorEl(wrapper.element)!.textContent).toBe("Need this!");
  });

  it("joins ':' params so pattern rules can contain colons", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="t" data-vd-rules="pattern:^\\d{2}:\\d{2}$" value="9am" />
        </div>
      </form>`);
    const field = wrapper.get<HTMLInputElement>("input").element;

    blur(field);
    expect(errorEl(wrapper.element)!.textContent).toBe("Invalid format");

    type(field, "12:34");
    expect(field.classList.contains("is-valid")).toBe(true);
  });

  it("silently passes unknown rule names (vanilla parity)", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="a" data-vd-rules="bogus" />
        </div>
      </form>`);
    const field = wrapper.get<HTMLInputElement>("input").element;

    blur(field);

    expect(field.classList.contains("is-invalid")).toBe(false);
    expect(errorEl(wrapper.element)).toBeNull();
  });

  it("match resolves by element id first, then by [name]", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input id="val-pass" name="pw" value="secret" />
        </div>
        <div class="vd-form-group">
          <input name="byId" data-vd-rules="match:val-pass" value="secret" />
        </div>
        <div class="vd-form-group">
          <input name="byName" data-vd-rules="match:pw" value="nope" />
        </div>
      </form>`);
    const byId = wrapper.get<HTMLInputElement>("[name=byId]").element;
    const byName = wrapper.get<HTMLInputElement>("[name=byName]").element;

    blur(byId);
    expect(byId.classList.contains("is-valid")).toBe(true);

    blur(byName);
    expect(byName.classList.contains("is-invalid")).toBe(true);
    expect(errorEl(byName.parentElement!)!.textContent).toBe(
      "Fields do not match",
    );

    type(byName, "secret");
    expect(byName.classList.contains("is-valid")).toBe(true);
  });

  it("input mode validates on every input event", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate" data-vd-validate-mode="input">
        <div class="vd-form-group">
          <input name="n" data-vd-rules="number" />
        </div>
      </form>`);
    const field = wrapper.get<HTMLInputElement>("input").element;

    type(field, "abc");
    expect(field.classList.contains("is-invalid")).toBe(true);
    expect(errorEl(wrapper.element)!.textContent).toBe(
      "Please enter a valid number",
    );

    type(field, "42");
    expect(field.classList.contains("is-valid")).toBe(true);
  });

  it("honors the per-field data-vd-validate-mode override", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input
            name="live"
            data-vd-rules="required"
            data-vd-validate-mode="input" />
        </div>
        <div class="vd-form-group">
          <input name="lazy" data-vd-rules="required" />
        </div>
      </form>`);
    const live = wrapper.get<HTMLInputElement>("[name=live]").element;
    const lazy = wrapper.get<HTMLInputElement>("[name=lazy]").element;

    type(live, "x");
    expect(live.classList.contains("is-valid")).toBe(true);

    type(lazy, "x");
    expect(lazy.classList.contains("is-valid")).toBe(false); // still blur mode
  });

  it("submit mode skips field events and validates only on submit", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate" data-vd-validate-mode="submit">
        <div class="vd-form-group">
          <input name="a" data-vd-rules="required" />
        </div>
      </form>`);
    const field = wrapper.get<HTMLInputElement>("input").element;
    const form = wrapper.get("form").element;

    blur(field);
    type(field, "");
    expect(field.classList.contains("is-invalid")).toBe(false);

    submit(form);
    expect(field.classList.contains("is-invalid")).toBe(true);
  });

  it("blocks an invalid submit, focuses the first invalid field, dispatches validate:submit", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="first" data-vd-rules="required" />
        </div>
        <div class="vd-form-group">
          <input name="second" data-vd-rules="required" />
        </div>
      </form>`);
    const form = wrapper.get("form").element;
    const details: Array<{ valid: boolean }> = [];
    form.addEventListener("validate:submit", (e) =>
      details.push((e as CustomEvent<{ valid: boolean }>).detail),
    );

    const ev = submit(form);

    expect(ev.defaultPrevented).toBe(true);
    expect(details).toEqual([{ valid: false }]);
    expect(document.activeElement).toBe(
      wrapper.get<HTMLInputElement>("[name=first]").element,
    );
  });

  it("lets a valid submit through and reports valid: true", () => {
    const { wrapper } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="a" data-vd-rules="required" value="ok" />
        </div>
      </form>`);
    const form = wrapper.get("form").element;
    const details: Array<{ valid: boolean }> = [];
    form.addEventListener("validate:submit", (e) =>
      details.push((e as CustomEvent<{ valid: boolean }>).detail),
    );

    const ev = submit(form);

    expect(ev.defaultPrevented).toBe(false);
    expect(details).toEqual([{ valid: true }]);
  });

  it("wires the root element itself when it is the form (vanilla queryAll parity)", () => {
    const { wrapper } = mountFormHost(`
      <div class="vd-form-group">
        <input name="a" data-vd-rules="required" />
      </div>`);
    const field = wrapper.get<HTMLInputElement>("input").element;

    blur(field);

    expect(field.classList.contains("is-invalid")).toBe(true);
  });

  it("controller validate() checks all fields and drives the reactive errors map", () => {
    const { wrapper, api } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="email" data-vd-rules="required|email" />
        </div>
        <div class="vd-form-group">
          <input name="age" data-vd-rules="number" value="30" />
        </div>
      </form>`);

    expect(api.validate()).toBe(false);
    expect(api.errors["email"]).toBe("This field is required");
    expect(api.errors["age"]).toBeUndefined();

    wrapper.get<HTMLInputElement>("[name=email]").element.value = "a@b.co";
    expect(api.validate()).toBe(true);
    expect(Object.keys(api.errors)).toHaveLength(0);
  });

  it("addRule registers instance-local rules with a default message", () => {
    const { wrapper, api } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="n" data-vd-rules="even" value="3" />
        </div>
      </form>`);
    api.addRule("even", (v) => Number(v) % 2 === 0, "Must be even");
    const field = wrapper.get<HTMLInputElement>("input").element;

    blur(field);
    expect(errorEl(wrapper.element)!.textContent).toBe("Must be even");

    type(field, "4");
    expect(field.classList.contains("is-valid")).toBe(true);
  });

  it("accepts options.mode / options.rules / options.messages (vd3 extension)", () => {
    const { wrapper } = mountHost(
      `<form class="vd-validate">
        <div class="vd-form-group">
          <input name="hex" data-vd-rules="hex" />
        </div>
      </form>`,
      {
        mode: "input",
        rules: { hex: (v) => /^[0-9a-f]+$/i.test(v) },
        messages: { hex: "Hex only" },
      },
    );
    const field = wrapper.get<HTMLInputElement>("input").element;

    type(field, "xyz"); // options.mode fallback made the form input-mode
    expect(field.classList.contains("is-invalid")).toBe(true);
    expect(errorEl(wrapper.element)!.textContent).toBe("Hex only");

    type(field, "c0ffee");
    expect(field.classList.contains("is-valid")).toBe(true);
  });

  it("reset() clears field state, aria wiring, error display, and the errors map", () => {
    const { wrapper, api } = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="a" data-vd-rules="required" />
        </div>
      </form>`);
    const field = wrapper.get<HTMLInputElement>("input").element;
    blur(field);
    expect(field.classList.contains("is-invalid")).toBe(true);

    api.reset();

    expect(field.classList.contains("is-invalid")).toBe(false);
    expect(field.hasAttribute("aria-invalid")).toBe(false);
    expect(field.hasAttribute("aria-describedby")).toBe(false);
    expect(errorEl(wrapper.element)!.style.display).toBe("none");
    expect(Object.keys(api.errors)).toHaveLength(0);
  });

  it("refresh() wires forms added after mount", () => {
    const { wrapper, api } = mountHost(`<p>no form yet</p>`);
    wrapper.element.insertAdjacentHTML(
      "beforeend",
      `<form class="vd-validate">
        <div class="vd-form-group">
          <input name="late" data-vd-rules="required" />
        </div>
      </form>`,
    );
    const field = wrapper.element.querySelector("input") as HTMLInputElement;

    blur(field);
    expect(field.classList.contains("is-invalid")).toBe(false); // not wired yet

    api.refresh();
    blur(field);
    expect(field.classList.contains("is-invalid")).toBe(true);
  });

  it("unmount removes listeners, generated error elements, and state marks", () => {
    const html = `
      <form class="vd-validate">
        <div class="vd-form-group">
          <input name="a" data-vd-rules="required" />
        </div>
      </form>`;
    const { wrapper } = mountHost(html);
    const field = wrapper.get<HTMLInputElement>("input").element;
    const group = field.parentElement!;
    blur(field);
    expect(errorEl(group)).not.toBeNull();

    wrapper.unmount();

    expect(errorEl(group)).toBeNull();
    expect(field.classList.contains("is-invalid")).toBe(false);
    expect(field.hasAttribute("aria-invalid")).toBe(false);
    expect(field.hasAttribute("aria-describedby")).toBe(false);

    blur(field);
    expect(field.classList.contains("is-invalid")).toBe(false); // listener gone
  });

  it("keeps a sibling instance working when one unmounts (per-instance teardown)", () => {
    const a = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group"><input name="a" data-vd-rules="required" /></div>
      </form>`);
    const b = mountHost(`
      <form class="vd-validate">
        <div class="vd-form-group"><input name="b" data-vd-rules="required" /></div>
      </form>`);

    a.wrapper.unmount();

    const fieldB = b.wrapper.get<HTMLInputElement>("input").element;
    blur(fieldB);
    expect(fieldB.classList.contains("is-invalid")).toBe(true);
  });
});
