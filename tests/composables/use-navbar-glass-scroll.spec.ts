import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h, ref, type Ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useNavbarGlassScroll } from "../../src/composables/useNavbarGlassScroll";

// window.scrollY is a read-only accessor in jsdom; drive it through a backing
// variable so tests can simulate scroll offsets deterministically.
let scrollY = 0;
const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");

const setScroll = (y: number): void => {
  scrollY = y;
  window.dispatchEvent(new Event("scroll"));
};

const mountNavbar = (
  navbar: Ref<HTMLElement | null>,
): { wrapper: VueWrapper; isScrolled: Ref<boolean> } => {
  let isScrolled!: Ref<boolean>;
  const wrapper = mount(
    defineComponent({
      setup() {
        isScrolled = useNavbarGlassScroll(navbar);
        return () => h("div");
      },
    }),
  );
  return { wrapper, isScrolled };
};

const buildNavbar = (
  variant: "glass" | "transparent" | "plain",
  threshold?: string,
): HTMLElement => {
  const el = document.createElement("nav");
  if (variant === "glass") el.classList.add("vd-navbar-glass");
  if (variant === "transparent") el.classList.add("vd-navbar-transparent");
  if (threshold !== undefined) el.dataset.scrollThreshold = threshold;
  document.body.appendChild(el);
  return el;
};

describe("useNavbarGlassScroll", () => {
  beforeEach(() => {
    scrollY = 0;
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      get: () => scrollY,
    });
  });

  afterEach(() => {
    if (originalScrollY) {
      Object.defineProperty(window, "scrollY", originalScrollY);
    }
    document.body.innerHTML = "";
  });

  it("returns a ref that starts false", () => {
    const navbar = buildNavbar("glass", "100");
    const { isScrolled } = mountNavbar(ref(navbar));
    expect(isScrolled.value).toBe(false);
  });

  it("does nothing for a navbar that is neither glass nor transparent", () => {
    const navbar = buildNavbar("plain");
    const { isScrolled } = mountNavbar(ref(navbar));
    setScroll(5000);
    expect(isScrolled.value).toBe(false);
  });

  it("toggles true/false around the data-scroll-threshold on scroll (glass)", () => {
    const navbar = buildNavbar("glass", "100");
    const { isScrolled } = mountNavbar(ref(navbar));

    setScroll(150);
    expect(isScrolled.value).toBe(true);
    setScroll(100); // not strictly greater than threshold
    expect(isScrolled.value).toBe(false);
    setScroll(101);
    expect(isScrolled.value).toBe(true);
  });

  it("works for transparent navbars too", () => {
    const navbar = buildNavbar("transparent", "10");
    const { isScrolled } = mountNavbar(ref(navbar));
    setScroll(20);
    expect(isScrolled.value).toBe(true);
  });

  it("falls back to a 60px threshold when offsetHeight is 0 and no attr", () => {
    const navbar = buildNavbar("glass");
    const { isScrolled } = mountNavbar(ref(navbar));
    setScroll(30);
    expect(isScrolled.value).toBe(false);
    setScroll(61);
    expect(isScrolled.value).toBe(true);
  });

  it("evaluates scroll position immediately on mount", () => {
    scrollY = 500;
    const navbar = buildNavbar("glass", "100");
    const { isScrolled } = mountNavbar(ref(navbar));
    // No dispatch yet — the composable calls its handler once on mount.
    expect(isScrolled.value).toBe(true);
  });

  it("removes the scroll listener on unmount", () => {
    const navbar = buildNavbar("glass", "100");
    const { wrapper, isScrolled } = mountNavbar(ref(navbar));
    expect(isScrolled.value).toBe(false);
    wrapper.unmount();

    setScroll(9999);
    expect(isScrolled.value).toBe(false);
  });

  it("no-ops when the navbar ref is null", () => {
    const { isScrolled } = mountNavbar(ref(null));
    setScroll(9999);
    expect(isScrolled.value).toBe(false);
  });
});
