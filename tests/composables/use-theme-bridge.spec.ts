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
  root.classList.remove("dark");
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

  it("mirrors the resolved scheme onto html.dark when syncDarkClass is set", async () => {
    const mode = ref<ThemeMode>("dark");
    const Host = defineComponent({
      setup() {
        useThemeBridge(mode, { syncDarkClass: true });
        return () => h("div");
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    mode.value = "light";
    await nextTick();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    wrapper.unmount();
  });

  it("follows the system scheme when syncing the dark class", async () => {
    let onChange: (() => void) | undefined;
    let dark = true;
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      get matches() {
        return query.includes("prefers-color-scheme: dark") ? dark : false;
      },
      media: query,
      addEventListener: (_type: string, listener: () => void) => {
        onChange = listener;
      },
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
    })) as unknown as typeof window.matchMedia;

    const mode = ref<ThemeMode>("system");
    const Host = defineComponent({
      setup() {
        useThemeBridge(mode, { syncDarkClass: true });
        return () => h("div");
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    dark = false;
    onChange?.();
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    mode.value = "dark";
    await nextTick();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    wrapper.unmount();
    window.matchMedia = original;
  });

  it("does not add html.dark unless syncDarkClass is requested", () => {
    const { wrapper } = mountBridge("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
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
