import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import VdGlobalSearch from "../../src/components/VdGlobalSearch.vue";
import type {
  GlobalSearchAdapter,
  GlobalSearchHit,
} from "../../src/composables/useGlobalSearch";

const hits: GlobalSearchHit[] = [
  {
    id: "button",
    title: "Button",
    route: "/components/button",
    icon: "cursor-click",
    category: "Components",
    categoryPath: "Components › Core",
  },
];

const adapter: GlobalSearchAdapter = {
  search: vi.fn(async () => hits),
  warmup: vi.fn(async () => {}),
};

let active: VueWrapper | null = null;

const factory = (props: Record<string, unknown> = {}): VueWrapper => {
  const wrapper = mount(VdGlobalSearch, {
    props: {
      adapter,
      debounceMs: 100,
      shortcut: false,
      ...props,
    },
    attachTo: document.body,
    global: {
      stubs: { Teleport: false },
    },
  });
  active = wrapper;
  return wrapper;
};

async function typeAndSettle(value: string): Promise<void> {
  const input = document.body.querySelector(
    "input.vd-global-search-input",
  ) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
  vi.advanceTimersByTime(150);
  await nextTick();
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (active) {
    active.unmount();
    active = null;
  }
  document.body.innerHTML = "";
});

describe("VdGlobalSearch", () => {
  it("renders dialog with AI toggle off by default", () => {
    vi.useFakeTimers();
    factory();
    expect(document.body.querySelector(".vd-global-search-modal")).toBeTruthy();
    expect(
      document.body.querySelector(".vd-global-search-ai-notice"),
    ).toBeFalsy();
  });

  it("shows results after debounced search", async () => {
    vi.useFakeTimers();
    const wrapper = factory();
    await (wrapper.vm as unknown as { open: () => void }).open();
    await typeAndSettle("but");
    expect(
      document.body.querySelector(".vd-global-search-result"),
    ).toBeTruthy();
    expect(adapter.search).toHaveBeenCalled();
  });

  it("shows AI notice when toggle enabled", async () => {
    vi.useFakeTimers();
    factory();
    const toggle = document.body.querySelector(
      ".vd-form-switch input",
    ) as HTMLInputElement;
    toggle.click();
    await nextTick();
    expect(
      document.body.querySelector(".vd-global-search-ai-notice"),
    ).toBeTruthy();
  });

  it("emits select when a result is clicked", async () => {
    vi.useFakeTimers();
    const wrapper = factory();
    await (wrapper.vm as unknown as { open: () => void }).open();
    await typeAndSettle("but");
    document.body
      .querySelector(".vd-global-search-result")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted("select")?.[0]?.[0]).toMatchObject({ id: "button" });
  });
});
