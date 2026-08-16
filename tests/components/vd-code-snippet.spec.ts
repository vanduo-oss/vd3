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

const XSS = `<img src="x" onerror="alert(1)"><script>alert(1)</script>`;

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

  it("places the simple-mode copy button in the header, not after the pre", () => {
    const wrapper = mount(VdCodeSnippet, { props: { code: "x" } });
    const figure = wrapper.get("figure.vd-code-snippet-simple");
    expect(figure.classes()).toContain("vd-code-snippet-single");
    const header = figure.get(".vd-code-snippet-header");
    expect(header.get("button.vd-code-snippet-copy").exists()).toBe(true);
    expect(figure.find("pre + button").exists()).toBe(false);
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

  it("escapes markup via text interpolation when highlight is absent", () => {
    const wrapper = mount(VdCodeSnippet, { props: { code: XSS } });
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find("script").exists()).toBe(false);
    expect(wrapper.get("pre code").text()).toBe(XSS);
    expect(wrapper.get("pre code").element.innerHTML).toContain("&lt;img");
  });
});

describe("VdCodeSnippet chrome mode", () => {
  const allTabs = {
    html: "<div>h</div>",
    shell: "pnpm test",
    css: ".x { color: red; }",
    js: "const x = 1;",
    vue: "<template>v</template>",
    json: '{"a":1}',
  };

  it("renders tabs in HTML → Shell → CSS → JavaScript → Vue → JSON order", () => {
    const wrapper = mount(VdCodeSnippet, {
      props: { ...allTabs, defaultOpen: true },
    });
    expect(wrapper.find("figure").exists()).toBe(false);
    const root = wrapper.get("div.vd-code-snippet");
    expect(root.attributes("data-collapsible")).toBeDefined();
    const tabs = root.findAll('[role="tab"]');
    expect(tabs.map((t) => t.text())).toEqual([
      "HTML",
      "Shell",
      "CSS",
      "JavaScript",
      "Vue",
      "JSON",
    ]);
    expect(tabs.map((t) => t.attributes("data-lang"))).toEqual([
      "html",
      "shell",
      "css",
      "js",
      "vue",
      "json",
    ]);
  });

  it("omits empty tab props and keeps ARIA on the tablist", () => {
    const wrapper = mount(VdCodeSnippet, {
      props: { html: "<p>x</p>", css: "", js: "ok", defaultOpen: true },
    });
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((t) => t.text())).toEqual(["HTML", "JavaScript"]);
    const tablist = wrapper.get('[role="tablist"]');
    expect(tablist.element.tagName).toBe("DIV");
    expect(tabs[0]!.attributes("aria-selected")).toBe("true");
    expect(tabs[1]!.attributes("aria-selected")).toBe("false");
    expect(tabs[0]!.classes()).toContain("is-active");
  });

  it("shows the View Code toggle and pane text while collapsed", () => {
    const wrapper = mount(VdCodeSnippet, {
      props: { html: "<p>hello pane</p>" },
    });
    const toggle = wrapper.get("button.vd-code-snippet-toggle");
    const pane = wrapper.get("pre.vd-code-snippet-pane");
    expect(toggle.text()).toContain("View Code");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(
      wrapper.get(".vd-code-snippet-content").attributes("data-visible"),
    ).toBe("false");
    expect(pane.text()).toBe("<p>hello pane</p>");
    expect(wrapper.get("button.vd-code-snippet-copy").exists()).toBe(true);
  });

  it("toggles collapse and sets tabindex on the active pane when expanded", async () => {
    const wrapper = mount(VdCodeSnippet, { props: { html: "<p>x</p>" } });
    const root = wrapper.get("div.vd-code-snippet");
    const toggle = wrapper.get("button.vd-code-snippet-toggle");
    const content = wrapper.get(".vd-code-snippet-content");
    const pane = wrapper.get("pre.vd-code-snippet-pane");

    expect(toggle.text()).toContain("View Code");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(root.attributes("data-expanded")).toBe("false");
    expect(content.attributes("data-visible")).toBe("false");
    expect(pane.attributes("tabindex")).toBe("-1");

    await toggle.trigger("click");

    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(root.attributes("data-expanded")).toBe("true");
    expect(content.attributes("data-visible")).toBe("true");
    expect(pane.attributes("tabindex")).toBe("0");
    expect(pane.classes()).toContain("is-active");
  });

  it("switches panes and moves tabindex with the active tab", async () => {
    const wrapper = mount(VdCodeSnippet, {
      props: { html: "H", css: "C", defaultOpen: true },
    });
    const tabs = wrapper.findAll('[role="tab"]');
    const panes = wrapper.findAll("pre.vd-code-snippet-pane");

    expect(panes[0]!.attributes("tabindex")).toBe("0");
    expect(panes[1]!.attributes("tabindex")).toBe("-1");
    expect(panes[1]!.classes()).not.toContain("is-active");

    await tabs[1]!.trigger("click");

    expect(tabs[0]!.attributes("aria-selected")).toBe("false");
    expect(tabs[1]!.attributes("aria-selected")).toBe("true");
    expect(panes[0]!.attributes("tabindex")).toBe("-1");
    expect(panes[1]!.attributes("tabindex")).toBe("0");
    expect(panes[1]!.classes()).toContain("is-active");
    expect(panes[1]!.get("code").text()).toBe("C");
  });

  it("omits data-collapsible and the toggle when collapsible is false", () => {
    const wrapper = mount(VdCodeSnippet, {
      props: { html: "<p>x</p>", collapsible: false },
    });
    const root = wrapper.get("div.vd-code-snippet");
    expect(root.attributes("data-collapsible")).toBeUndefined();
    expect(wrapper.find("button.vd-code-snippet-toggle").exists()).toBe(false);
    expect(
      wrapper.get(".vd-code-snippet-content").attributes("data-visible"),
    ).toBe("true");
    expect(wrapper.get("pre.vd-code-snippet-pane").attributes("tabindex")).toBe(
      "0",
    );
  });

  it("uses a custom toggle label and hides chrome copy when copyable is false", () => {
    const wrapper = mount(VdCodeSnippet, {
      props: {
        html: "<p>x</p>",
        toggleLabel: "Show source",
        copyable: false,
        defaultOpen: true,
      },
    });
    expect(wrapper.get("button.vd-code-snippet-toggle").text()).toContain(
      "Show source",
    );
    expect(wrapper.find("button.vd-code-snippet-copy").exists()).toBe(false);
  });

  it("prefers chrome mode when both code and a tab prop are set", () => {
    const wrapper = mount(VdCodeSnippet, {
      props: { code: "simple", html: "<div>chrome</div>", defaultOpen: true },
    });
    expect(wrapper.find("figure").exists()).toBe(false);
    expect(wrapper.findAll("button.vd-code-snippet-copy")).toHaveLength(1);
    expect(wrapper.get("pre.vd-code-snippet-pane code").text()).toBe(
      "<div>chrome</div>",
    );
  });

  it("copies the raw active tab and ignores highlighted HTML", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const writeText = stubClipboard();
    const highlight = vi.fn(
      (code: string, language: string) =>
        `<span class="vd-tk-keyword" data-lang="${language}">MARKED:${code}</span>`,
    );
    const wrapper = mount(VdCodeSnippet, {
      props: {
        html: "raw html",
        js: "raw js",
        defaultOpen: true,
        highlight,
      },
    });

    expect(highlight).toHaveBeenCalledWith("raw html", "html");
    expect(highlight).toHaveBeenCalledWith("raw js", "js");
    expect(wrapper.find("span.vd-tk-keyword").exists()).toBe(true);
    expect(wrapper.find("span.vd-tk-keyword").text()).toBe("MARKED:raw html");

    const copy = wrapper.get("button.vd-code-snippet-copy");
    expect(copy.classes()).not.toContain("vd-btn");
    await copy.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("raw html");
    expect(copy.attributes("aria-label")).toBe("Copied");
    expect(copy.text()).toContain("Copied");

    await wrapper.get('[data-lang="js"][role="tab"]').trigger("click");
    await copy.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenLastCalledWith("raw js");
  });

  it("uses v-html only when highlight is provided", () => {
    const withHook = mount(VdCodeSnippet, {
      props: {
        html: "const x = 1;",
        defaultOpen: true,
        highlight: (code) => `<em class="tok">${code}</em>`,
      },
    });
    expect(withHook.find("em.tok").exists()).toBe(true);

    const withoutHook = mount(VdCodeSnippet, {
      props: { html: XSS, defaultOpen: true },
    });
    expect(withoutHook.find("img").exists()).toBe(false);
    expect(withoutHook.find("script").exists()).toBe(false);
    expect(withoutHook.find("em.tok").exists()).toBe(false);
    expect(withoutHook.get("pre.vd-code-snippet-pane code").text()).toBe(XSS);
    expect(
      withoutHook.get("pre.vd-code-snippet-pane code").element.innerHTML,
    ).toContain("&lt;img");
  });

  it("passes the simple-mode language prop to highlight and still copies raw", async () => {
    const writeText = stubClipboard();
    const highlight = vi.fn(
      (code: string, language: string) =>
        `<span class="tok">${language}:${code}</span>`,
    );
    const wrapper = mount(VdCodeSnippet, {
      props: { code: "const a = 1;", language: "js", highlight },
    });
    expect(highlight).toHaveBeenCalledWith("const a = 1;", "js");
    expect(wrapper.get("figure pre code").find("span.tok").text()).toBe(
      "js:const a = 1;",
    );
    await wrapper.get("button.vd-code-snippet-copy").trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("const a = 1;");
  });
});
