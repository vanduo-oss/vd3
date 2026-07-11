import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import VdDocSearch from "../../src/components/VdDocSearch.vue";
import type { DocSearchDoc } from "../../src/composables/useDocSearch";

/**
 * Component specs for VdDocSearch — the thin combobox/listbox shell over
 * useDocSearch. Verifies the `.vd-doc-search*` markup contract, combobox/listbox
 * ARIA wiring, debounced result rendering, keyboard navigation, and selection
 * emit. Debounced input is driven through fake timers.
 */

const docs: DocSearchDoc[] = [
  {
    id: "button",
    title: "Button",
    category: "Components",
    content: "A clickable button element",
  },
  {
    id: "badge",
    title: "Badge",
    category: "Components",
    content: "Small count and labeling",
  },
  {
    id: "alert",
    title: "Alert",
    category: "Feedback",
    content: "Contextual feedback messages",
  },
];

let active: VueWrapper | null = null;

const factory = (props: Record<string, unknown> = {}): VueWrapper => {
  const wrapper = mount(VdDocSearch, {
    props: { data: docs, debounceMs: 150, ...props },
    attachTo: document.body,
  });
  active = wrapper;
  return wrapper;
};

/** Type into the input and let the debounce + reactive render settle. */
async function typeAndSettle(
  wrapper: VueWrapper,
  value: string,
): Promise<void> {
  await wrapper.get("input.vd-doc-search-input").setValue(value);
  await nextTick(); // let the query watcher schedule the debounce
  vi.advanceTimersByTime(200); // clear the debounce window
  await nextTick(); // render the results
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (active) {
    active.unmount();
    active = null;
  }
});

describe("VdDocSearch structure + base ARIA", () => {
  it("renders the input wrapper, combobox input and results listbox", () => {
    const wrapper = factory();

    const root = wrapper.get(".vd-doc-search");
    expect(root.find(".vd-doc-search-input-wrapper").exists()).toBe(true);
    expect(
      root.find("i.vd-doc-search-icon.ph.ph-magnifying-glass").exists(),
    ).toBe(true);

    const input = root.get("input.vd-doc-search-input");
    expect(input.attributes("type")).toBe("search");
    expect(input.attributes("role")).toBe("combobox");
    expect(input.attributes("aria-autocomplete")).toBe("list");
    expect(input.attributes("aria-expanded")).toBe("false");
    expect(input.attributes("aria-activedescendant")).toBeUndefined();

    const results = root.get(".vd-doc-search-results");
    expect(results.attributes("role")).toBe("listbox");
    expect(results.attributes("aria-label")).toBe("Search results");
    expect(results.classes()).not.toContain("is-open");
    // aria-controls points at the results container.
    expect(input.attributes("aria-controls")).toBe(results.attributes("id"));
  });

  it("shows the shortcut badge only when keyboardShortcut is on", () => {
    expect(factory().find(".vd-doc-search-shortcut").exists()).toBe(true);
    active!.unmount();
    active = null;
    expect(
      factory({ keyboardShortcut: false })
        .find(".vd-doc-search-shortcut")
        .exists(),
    ).toBe(false);
  });

  it("forwards the placeholder prop", () => {
    const wrapper = factory({ placeholder: "Find anything" });
    expect(
      wrapper.get("input.vd-doc-search-input").attributes("placeholder"),
    ).toBe("Find anything");
  });
});

describe("VdDocSearch results rendering + keyboard nav", () => {
  it("opens with ARIA options, highlighted matches, then ArrowDown activates", async () => {
    vi.useFakeTimers();
    const wrapper = factory();
    await typeAndSettle(wrapper, "components");

    const input = wrapper.get("input.vd-doc-search-input");
    const results = wrapper.get(".vd-doc-search-results");
    expect(results.classes()).toContain("is-open");
    expect(input.attributes("aria-expanded")).toBe("true");

    const options = wrapper.findAll(".vd-doc-search-result");
    expect(options.length).toBe(2); // button + badge share the Components category
    expect(options[0]!.attributes("role")).toBe("option");
    expect(options[0]!.attributes("data-category")).toBe("components");
    expect(options[0]!.attributes("aria-selected")).toBe("false");
    // Category term is highlighted inside the rendered option.
    expect(wrapper.find(".vd-doc-search-result-category").exists()).toBe(true);
    expect(wrapper.find(".vd-doc-search-footer").exists()).toBe(true);

    await input.trigger("keydown", { key: "ArrowDown" });
    expect(options[0]!.classes()).toContain("is-active");
    expect(options[0]!.attributes("aria-selected")).toBe("true");
    expect(input.attributes("aria-activedescendant")).toBe(
      options[0]!.attributes("id"),
    );

    await input.trigger("keydown", { key: "ArrowDown" });
    expect(wrapper.findAll(".vd-doc-search-result")[1]!.classes()).toContain(
      "is-active",
    );
  });

  it("highlights the matched term with the highlight tag", async () => {
    vi.useFakeTimers();
    const wrapper = factory();
    await typeAndSettle(wrapper, "button");
    expect(wrapper.find(".vd-doc-search-result-title mark").exists()).toBe(
      true,
    );
  });
});

describe("VdDocSearch selection", () => {
  it("emits select once and closes on Enter", async () => {
    vi.useFakeTimers();
    const wrapper = factory();
    await typeAndSettle(wrapper, "components");

    const input = wrapper.get("input.vd-doc-search-input");
    await input.trigger("keydown", { key: "ArrowDown" }); // active 0 = button
    await input.trigger("keydown", { key: "Enter" });

    const selectEvents = wrapper.emitted("select");
    expect(selectEvents).toHaveLength(1);
    expect((selectEvents![0]![0] as { id: string }).id).toBe("button");
    expect(wrapper.get(".vd-doc-search-results").classes()).not.toContain(
      "is-open",
    );
  });

  it("emits select on result click", async () => {
    vi.useFakeTimers();
    const wrapper = factory();
    await typeAndSettle(wrapper, "components");

    await wrapper.findAll(".vd-doc-search-result")[1]!.trigger("click");

    const selectEvents = wrapper.emitted("select");
    expect(selectEvents).toHaveLength(1);
    expect((selectEvents![0]![0] as { id: string }).id).toBe("badge");
    expect(wrapper.get(".vd-doc-search-results").classes()).not.toContain(
      "is-open",
    );
  });
});

describe("VdDocSearch empty state", () => {
  it("renders the empty block when nothing matches", async () => {
    vi.useFakeTimers();
    const wrapper = factory();
    await typeAndSettle(wrapper, "zzzzz");

    expect(wrapper.get(".vd-doc-search-results").classes()).toContain(
      "is-open",
    );
    expect(wrapper.find(".vd-doc-search-empty").exists()).toBe(true);
    expect(wrapper.find(".vd-doc-search-result").exists()).toBe(false);
    expect(wrapper.get(".vd-doc-search-empty-title").text()).toBe(
      "No results found",
    );
  });
});
