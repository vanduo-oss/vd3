import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { useThemeBridge } from "../../src/composables/useThemeBridge";
import type { ThemeMode } from "../../src/composables/useTheme";

/**
 * useThemeBridge drives Vanduo's <html data-theme> from an app-owned mode ref.
 * It needs a component scope (onMounted + watch), so each test mounts a tiny
 * host that owns the ref.
 */

const ROOT_ATTRS = [
  "data-palette",
  "data-primary",
  "data-neutral",
  "data-radius",
  "data-font",
  "data-theme",
];

function cleanRoot(): void {
  const root = document.documentElement;
  ROOT_ATTRS.forEach((a) => root.removeAttribute(a));
  root.style.removeProperty("--vd-radius-scale");
}

/** Mount a host that bridges the returned ref; caller drives `mode.value`. */
function mountBridge(initial: ThemeMode) {
  const mode = ref<ThemeMode>(initial);
  const Host = defineComponent({
    setup() {
      useThemeBridge(mode);
      return () => h("div");
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  return { wrapper, mode };
}

beforeEach(() => {
  window.localStorage.clear();
  cleanRoot();
});

afterEach(() => {
  window.localStorage.clear();
  cleanRoot();
});

describe("useThemeBridge", () => {
  it("applies data-theme from the initial ref value on mount", () => {
    const { wrapper } = mountBridge("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    wrapper.unmount();
  });

  it("reacts to ref changes and updates data-theme", async () => {
    const { wrapper, mode } = mountBridge("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    mode.value = "light";
    await nextTick();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    wrapper.unmount();
  });

  it("removes data-theme when the ref is 'system'", async () => {
    const { wrapper, mode } = mountBridge("dark");
    mode.value = "system";
    await nextTick();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    wrapper.unmount();
  });

  it("re-derives the default primary accent for the bridged scheme", async () => {
    // localStorage empty -> loadPreference() yields the default light accent.
    const { wrapper, mode } = mountBridge("dark");
    // Bridging to dark re-derives black -> the dark accent.
    expect(document.documentElement.getAttribute("data-primary")).toBe("amber");

    mode.value = "light";
    await nextTick();
    expect(document.documentElement.getAttribute("data-primary")).toBe("black");
    wrapper.unmount();
  });

  it("stops reacting after unmount (watcher disposed)", async () => {
    const { wrapper, mode } = mountBridge("dark");
    wrapper.unmount();

    // Sentinel: prove later ref changes do not touch data-theme.
    document.documentElement.setAttribute("data-theme", "sentinel");
    mode.value = "light";
    await nextTick();
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "sentinel",
    );
  });
});
