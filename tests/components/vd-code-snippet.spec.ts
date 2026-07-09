import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import VdCodeSnippet from "../../src/components/VdCodeSnippet.vue";

const stubClipboard = (): ReturnType<typeof vi.fn> => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
};

afterEach(() => {
  vi.useRealTimers();
  // Remove the stubbed clipboard so tests stay independent.
  delete (navigator as unknown as Record<string, unknown>).clipboard;
});

describe("VdCodeSnippet", () => {
  it("renders a figure.vd-code-snippet with the code inside pre > code", () => {
    const wrapper = mount(VdCodeSnippet, {
      props: { code: "<div>hello</div>" },
    });
    const figure = wrapper.get("figure.vd-code-snippet");
    const pre = figure.get("pre.vd-code-snippet-pre");
    expect(pre.get("code").text()).toBe("<div>hello</div>");
  });

  it("defaults language to html on the pre class and data attribute", () => {
    const wrapper = mount(VdCodeSnippet, { props: { code: "x" } });
    const pre = wrapper.get("pre");
    expect(pre.classes()).toContain("language-html");
    expect(pre.attributes("data-language")).toBe("html");
  });

  it("maps the language prop to language-* class and data-language", () => {
    const wrapper = mount(VdCodeSnippet, {
      props: { code: "const a = 1;", language: "js" },
    });
    const pre = wrapper.get("pre");
    expect(pre.classes()).toContain("language-js");
    expect(pre.attributes("data-language")).toBe("js");
  });

  it("renders the copy button by default with its class contract", () => {
    const wrapper = mount(VdCodeSnippet, { props: { code: "x" } });
    const button = wrapper.get("button.vd-code-snippet-copy");
    expect(button.classes()).toEqual(
      expect.arrayContaining(["vd-btn", "vd-btn-ghost", "vd-btn-sm"]),
    );
    expect(button.attributes("type")).toBe("button");
    expect(button.attributes("aria-label")).toBe("Copy code");
    expect(button.text()).toContain("Copy");
    expect(button.find("i.ph-copy").exists()).toBe(true);
  });

  it("hides the copy button when copyable=false", () => {
    const wrapper = mount(VdCodeSnippet, {
      props: { code: "x", copyable: false },
    });
    expect(wrapper.find("button.vd-code-snippet-copy").exists()).toBe(false);
  });

  it("copies the code and shows a Copied state that resets after 1.5s", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const writeText = stubClipboard();
    const wrapper = mount(VdCodeSnippet, { props: { code: "copy me" } });
    const button = wrapper.get("button.vd-code-snippet-copy");

    await button.trigger("click");
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith("copy me");
    expect(button.attributes("aria-label")).toBe("Copied");
    expect(button.text()).toContain("Copied");
    expect(button.find("i.ph-check").exists()).toBe(true);

    vi.advanceTimersByTime(1500);
    await nextTick();

    expect(button.attributes("aria-label")).toBe("Copy code");
    expect(button.text()).toContain("Copy");
    expect(button.find("i.ph-copy").exists()).toBe(true);
  });

  it("stays in the Copy state when the clipboard API is unavailable", async () => {
    const wrapper = mount(VdCodeSnippet, { props: { code: "x" } });
    const button = wrapper.get("button.vd-code-snippet-copy");
    await button.trigger("click");
    await flushPromises();
    expect(button.attributes("aria-label")).toBe("Copy code");
  });
});
