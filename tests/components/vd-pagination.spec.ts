import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import VdPagination from "../../src/components/VdPagination.vue";

const factory = (props: Record<string, unknown> = {}) =>
  mount(VdPagination, {
    props: { modelValue: 1, total: 5, ...props },
  });

describe("VdPagination", () => {
  it("renders the framework DOM contract with defaults", () => {
    const wrapper = factory();
    expect(wrapper.element.tagName).toBe("NAV");
    expect(wrapper.attributes("aria-label")).toBe("Pagination");

    const list = wrapper.find("ul.vd-pagination");
    expect(list.exists()).toBe(true);
    expect(list.classes()).toContain("vd-pagination-md"); // default size
    expect(list.classes()).toContain("vd-pagination-left"); // default align

    // prev + 5 pages + next
    expect(wrapper.findAll("li.vd-pagination-item")).toHaveLength(7);
    expect(wrapper.findAll("li[data-page]")).toHaveLength(5);
    expect(wrapper.findAll("a.vd-pagination-link")).toHaveLength(7);
  });

  it.each(["sm", "md", "lg"] as const)(
    "maps size=%s to vd-pagination-%s",
    (size) => {
      const wrapper = factory({ size });
      expect(wrapper.find("ul").classes()).toContain(`vd-pagination-${size}`);
    },
  );

  it.each(["left", "center", "right"] as const)(
    "maps align=%s to vd-pagination-%s",
    (align) => {
      const wrapper = factory({ align });
      expect(wrapper.find("ul").classes()).toContain(`vd-pagination-${align}`);
    },
  );

  it("marks the current page active with aria-current='page'", () => {
    const wrapper = factory({ modelValue: 3 });
    const active = wrapper.find("li[data-page='3']");
    expect(active.classes()).toContain("active");
    expect(active.find("a").attributes("aria-current")).toBe("page");
    expect(active.find("a").attributes("aria-label")).toBe("Page 3");

    const other = wrapper.find("li[data-page='2']");
    expect(other.classes()).not.toContain("active");
    expect(other.find("a").attributes("aria-current")).toBeUndefined();
  });

  it("disables prev on the first page and next on the last page", async () => {
    const wrapper = factory({ modelValue: 1 });
    expect(wrapper.find(".vd-pagination-prev").classes()).toContain("disabled");
    expect(wrapper.find(".vd-pagination-next").classes()).not.toContain(
      "disabled",
    );

    await wrapper.setProps({ modelValue: 5 });
    expect(wrapper.find(".vd-pagination-prev").classes()).not.toContain(
      "disabled",
    );
    expect(wrapper.find(".vd-pagination-next").classes()).toContain("disabled");
  });

  it("renders ellipses per the framework calculatePages algorithm", () => {
    // current=10 of 20 with maxVisible=7 -> 1 … 7 8 9 10 11 12 13 … 20
    const wrapper = factory({ modelValue: 10, total: 20 });
    const ellipses = wrapper.findAll(".vd-pagination-ellipsis");
    expect(ellipses).toHaveLength(2);
    expect(ellipses[0].attributes("aria-hidden")).toBe("true");
    expect(
      wrapper.findAll("li[data-page]").map((li) => li.attributes("data-page")),
    ).toEqual(["1", "7", "8", "9", "10", "11", "12", "13", "20"]);
  });

  it("renders a single trailing ellipsis near the start", () => {
    // current=1 of 10 with maxVisible=7 -> 1 2 3 4 5 6 … 10
    const wrapper = factory({ modelValue: 1, total: 10 });
    expect(wrapper.findAll(".vd-pagination-ellipsis")).toHaveLength(1);
    expect(
      wrapper.findAll("li[data-page]").map((li) => li.attributes("data-page")),
    ).toEqual(["1", "2", "3", "4", "5", "6", "10"]);
  });

  it("emits update:modelValue and a bubbling pagination:change on page click", async () => {
    const wrapper = factory({ modelValue: 2, total: 5 });
    const onChange = vi.fn();
    wrapper.element.addEventListener("pagination:change", onChange);

    await wrapper.find("li[data-page='4'] a").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[4]]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const event = onChange.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ page: 4, totalPages: 5 });
    expect(event.bubbles).toBe(true);
  });

  it("navigates via prev/next links", async () => {
    const wrapper = factory({ modelValue: 3, total: 5 });
    await wrapper.find(".vd-pagination-prev a").trigger("click");
    await wrapper.find(".vd-pagination-next a").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[2], [4]]);
  });

  it("does not emit for the current page or out-of-range targets", async () => {
    const wrapper = factory({ modelValue: 1, total: 3 });
    await wrapper.find("li[data-page='1'] a").trigger("click"); // same page
    await wrapper.find(".vd-pagination-prev a").trigger("click"); // page 0
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("ignores all clicks and flags prev/next when disabled", async () => {
    const wrapper = factory({ modelValue: 2, total: 5, disabled: true });
    expect(wrapper.find(".vd-pagination-prev").classes()).toContain("disabled");
    expect(wrapper.find(".vd-pagination-next").classes()).toContain("disabled");

    await wrapper.find("li[data-page='4'] a").trigger("click");
    await wrapper.find(".vd-pagination-next a").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
