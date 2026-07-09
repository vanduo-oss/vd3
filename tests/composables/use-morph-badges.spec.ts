import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type Ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useMorphBadges } from "../../src/composables/useMorphBadges";

const mountWith = (root: Ref<HTMLElement | null>): VueWrapper =>
  mount(
    defineComponent({
      setup() {
        useMorphBadges(root);
        return () => h("div");
      },
    }),
  );

interface BadgeSpec {
  states: string[];
  classes: string[];
  icons: string[];
  initialClass?: string;
  currentText?: string;
  nextText?: string;
}

// useMorphBadges does NOT create the morph sub-layers (unlike useMorph); it only
// queries them, so the badge markup ships with wave/current/next pre-built.
const buildBadge = (spec: BadgeSpec): HTMLElement => {
  const badge = document.createElement("span");
  badge.setAttribute("data-vd-morph", "manual");
  badge.setAttribute("data-morph-states", JSON.stringify(spec.states));
  badge.setAttribute("data-morph-classes", JSON.stringify(spec.classes));
  badge.setAttribute("data-morph-icons", JSON.stringify(spec.icons));
  badge.classList.add("vd-badge");
  if (spec.initialClass) badge.classList.add(spec.initialClass);

  const wave = document.createElement("span");
  wave.className = "vd-morph-wave";
  const current = document.createElement("span");
  current.className = "vd-morph-current";
  current.textContent = spec.currentText ?? spec.states[0] ?? "";
  const next = document.createElement("span");
  next.className = "vd-morph-next";
  next.textContent = spec.nextText ?? spec.states[1] ?? "";
  badge.append(wave, current, next);
  return badge;
};

const click = (el: HTMLElement, x = 40, y = 20): void => {
  el.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y }));
};

let container: HTMLElement;

describe("useMorphBadges", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    container.remove();
  });

  it("on click stages the next state's content immediately and marks is-morphing", () => {
    const badge = buildBadge({
      states: ["Draft", "Published", "Archived"],
      classes: ["vd-badge-warning", "vd-badge-success", "vd-badge-neutral"],
      icons: ["ph-pencil", "ph-check", "ph-archive"],
      initialClass: "vd-badge-warning",
    });
    container.appendChild(badge);
    mountWith(ref(container));

    click(badge, 12, 8);
    expect(badge.classList.contains("is-morphing")).toBe(true);

    // Wave repositioned at the pointer (rect is zero in jsdom).
    const wave = badge.querySelector<HTMLElement>(".vd-morph-wave");
    expect(wave?.style.left).toBe("12px");
    expect(wave?.style.top).toBe("8px");

    // The hidden "next" pane is pre-filled with state index 1 (Published/check).
    const next = badge.querySelector(".vd-morph-next");
    expect(next?.querySelector("i.ph.ph-check")).not.toBeNull();
    expect(next?.textContent).toBe("Published");
  });

  it("after the morph window swaps the badge variant class and cycles content", () => {
    const badge = buildBadge({
      states: ["Draft", "Published", "Archived"],
      classes: ["vd-badge-warning", "vd-badge-success", "vd-badge-neutral"],
      icons: ["ph-pencil", "ph-check", "ph-archive"],
      initialClass: "vd-badge-warning",
    });
    container.appendChild(badge);
    mountWith(ref(container));

    click(badge);
    vi.advanceTimersByTime(750);

    expect(badge.classList.contains("is-morphing")).toBe(false);
    // Old variant removed, new variant (index 1) applied; base class untouched.
    expect(badge.classList.contains("vd-badge")).toBe(true);
    expect(badge.classList.contains("vd-badge-warning")).toBe(false);
    expect(badge.classList.contains("vd-badge-success")).toBe(true);
    // current now shows index 1, next is primed with index 2 (afterIdx).
    const current = badge.querySelector(".vd-morph-current");
    const next = badge.querySelector(".vd-morph-next");
    expect(current?.textContent).toBe("Published");
    expect(current?.querySelector("i.ph.ph-check")).not.toBeNull();
    expect(next?.textContent).toBe("Archived");
    expect(next?.querySelector("i.ph.ph-archive")).not.toBeNull();
  });

  it("wraps around to the first state after the last", () => {
    const badge = buildBadge({
      states: ["Draft", "Published", "Archived"],
      classes: ["vd-badge-warning", "vd-badge-success", "vd-badge-neutral"],
      icons: ["ph-pencil", "ph-check", "ph-archive"],
      initialClass: "vd-badge-warning",
    });
    container.appendChild(badge);
    mountWith(ref(container));

    click(badge); // -> index 1
    vi.advanceTimersByTime(750);
    click(badge); // -> index 2
    vi.advanceTimersByTime(750);
    expect(badge.classList.contains("vd-badge-neutral")).toBe(true);
    const current = badge.querySelector(".vd-morph-current");
    const next = badge.querySelector(".vd-morph-next");
    expect(current?.textContent).toBe("Archived");
    // afterIdx wraps to 0 -> Draft.
    expect(next?.textContent).toBe("Draft");

    click(badge); // -> index 0 (wrap)
    vi.advanceTimersByTime(750);
    expect(badge.classList.contains("vd-badge-warning")).toBe(true);
    expect(badge.querySelector(".vd-morph-current")?.textContent).toBe("Draft");
  });

  it("sanitizes icon class names (strips characters outside [a-z0-9-\\s])", () => {
    const badge = buildBadge({
      states: ["One", "Two"],
      classes: ["vd-badge-info", "vd-badge-info"],
      icons: ["ph-clean", "ph-a.b/c!"],
    });
    container.appendChild(badge);
    mountWith(ref(container));

    click(badge);
    const next = badge.querySelector(".vd-morph-next");
    const icon = next?.querySelector("i");
    // "ph-a.b/c!" -> "ph-abc"; margin styled inline.
    expect(icon?.className).toBe("ph ph-abc");
    expect(icon?.style.marginRight).toBe("0.35rem");
  });

  it("renders a plain text node with no <i> when the icon is empty", () => {
    const badge = buildBadge({
      states: ["One", "Two"],
      classes: [],
      icons: ["", ""],
    });
    container.appendChild(badge);
    mountWith(ref(container));

    click(badge);
    const next = badge.querySelector(".vd-morph-next");
    expect(next?.querySelector("i")).toBeNull();
    expect(next?.textContent).toBe("Two");
  });

  it("does nothing when there are no states", () => {
    const badge = buildBadge({ states: [], classes: [], icons: [] });
    container.appendChild(badge);
    mountWith(ref(container));

    click(badge);
    expect(badge.classList.contains("is-morphing")).toBe(false);
    vi.runAllTimers();
    expect(badge.classList.contains("is-morphing")).toBe(false);
  });

  it("ignores re-entrant clicks (advances one state, not two)", () => {
    const badge = buildBadge({
      states: ["Draft", "Published", "Archived"],
      classes: ["vd-badge-warning", "vd-badge-success", "vd-badge-neutral"],
      icons: ["ph-pencil", "ph-check", "ph-archive"],
      initialClass: "vd-badge-warning",
    });
    container.appendChild(badge);
    mountWith(ref(container));

    click(badge);
    vi.advanceTimersByTime(200);
    click(badge); // ignored while morphing
    vi.advanceTimersByTime(550);
    expect(badge.classList.contains("vd-badge-success")).toBe(true); // index 1
    expect(badge.classList.contains("vd-badge-neutral")).toBe(false); // not index 2
  });

  it("honours a custom --vd-morph-duration", () => {
    const badge = buildBadge({
      states: ["Draft", "Published"],
      classes: ["vd-badge-warning", "vd-badge-success"],
      icons: ["ph-pencil", "ph-check"],
      initialClass: "vd-badge-warning",
    });
    badge.style.setProperty("--vd-morph-duration", "300ms");
    container.appendChild(badge);
    mountWith(ref(container));

    click(badge);
    vi.advanceTimersByTime(299);
    expect(badge.classList.contains("vd-badge-success")).toBe(false);
    vi.advanceTimersByTime(1);
    expect(badge.classList.contains("vd-badge-success")).toBe(true);
  });

  it("removes the click listener on unmount", () => {
    const badge = buildBadge({
      states: ["Draft", "Published"],
      classes: ["vd-badge-warning", "vd-badge-success"],
      icons: ["ph-pencil", "ph-check"],
      initialClass: "vd-badge-warning",
    });
    container.appendChild(badge);
    const wrapper = mountWith(ref(container));
    wrapper.unmount();

    click(badge);
    expect(badge.classList.contains("is-morphing")).toBe(false);
    vi.runAllTimers();
    expect(badge.classList.contains("vd-badge-success")).toBe(false);
  });
});
