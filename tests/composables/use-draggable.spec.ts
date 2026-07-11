import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref, type Ref } from "vue";
import { useDraggable } from "../../src/composables/useDraggable";

// Each composable runs in a component scope: mount a host whose root ref is
// handed to the composable, with the fixture markup injected as innerHTML so
// the composable's onMounted `querySelectorAll` scan sees real DOM.
const mounted: VueWrapper[] = [];

function mountHost<T>(
  html: string,
  use: (root: Ref<HTMLElement | null>) => T,
): { wrapper: VueWrapper; api: T } {
  let api!: T;
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = use(root);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, api };
}

// jsdom lacks a DragEvent constructor and a real DataTransfer, so synthesize a
// bubbling/cancelable Event carrying the client coords + a DataTransfer stub
// the handlers read (`dropEffect`, `effectAllowed`, `setData`).
function fireDrag(
  el: Element,
  type: string,
  opts: { clientX?: number; clientY?: number } = {},
): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const store: Record<string, string> = {};
  Object.assign(ev, {
    clientX: opts.clientX ?? 0,
    clientY: opts.clientY ?? 0,
    dataTransfer: {
      dropEffect: "",
      effectAllowed: "",
      setData: (k: string, v: string) => {
        store[k] = v;
      },
      getData: (k: string) => store[k] ?? "",
    },
  });
  el.dispatchEvent(ev);
  return ev;
}

interface TouchInit {
  clientX: number;
  clientY: number;
}

// jsdom lacks a TouchEvent constructor; synthesize the touch/changedTouches
// lists the handlers read.
function fireTouch(
  el: Element,
  type: string,
  touch: TouchInit | null,
  { cancelable = true }: { cancelable?: boolean } = {},
): Event {
  const ev = new Event(type, { bubbles: true, cancelable });
  const list = touch ? [touch] : [];
  Object.assign(ev, { touches: list, changedTouches: list });
  el.dispatchEvent(ev);
  return ev;
}

// Give an element a fixed box so the midpoint-reorder math has real geometry.
function stubRect(
  el: Element,
  rect: { top: number; left: number; width: number; height: number },
): void {
  el.getBoundingClientRect = () =>
    ({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }) as DOMRect;
}

afterEach(() => {
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted by the test under test */
    }
  }
  mounted.length = 0;
  document.body
    .querySelectorAll(".vd-drag-feedback")
    .forEach((n) => n.remove());
});

describe("useDraggable", () => {
  it("bootstraps item attributes and ARIA", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable" data-draggable="alpha">Alpha</div>`,
      useDraggable,
    );
    const item = wrapper.get(".vd-draggable").element;

    expect(item.getAttribute("draggable")).toBe("true");
    expect(item.getAttribute("tabindex")).toBe("0");
    expect(item.getAttribute("role")).toBe("option");
    expect(item.getAttribute("aria-roledescription")).toBe("draggable item");
    expect(item.getAttribute("aria-grabbed")).toBe("false");
  });

  it("wires container ARIA + a body-level feedback ghost", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable-container">
         <div class="vd-draggable-item">A</div>
       </div>`,
      useDraggable,
    );
    const container = wrapper.get(".vd-draggable-container").element;

    expect(container.getAttribute("role")).toBe("listbox");
    expect(container.getAttribute("aria-label")).toBe("Draggable items");
    // Container children auto-wired as draggables.
    expect(wrapper.get(".vd-draggable-item").attributes("role")).toBe("option");
    expect(document.body.querySelector(".vd-drag-feedback")).not.toBeNull();
  });

  it("wires drop-zone ARIA", () => {
    const { wrapper } = mountHost(
      `<div class="vd-drop-zone"></div>`,
      useDraggable,
    );
    const zone = wrapper.get(".vd-drop-zone").element;
    expect(zone.getAttribute("role")).toBe("region");
    expect(zone.getAttribute("aria-dropeffect")).toBe("move");
    expect(zone.getAttribute("aria-label")).toBe("Drop zone");
  });

  it("runs the drag lifecycle: classes, aria-grabbed, and events", () => {
    vi.useFakeTimers();
    const { wrapper } = mountHost(
      `<div class="vd-draggable">A</div>`,
      useDraggable,
    );
    const item = wrapper.get(".vd-draggable").element;
    const starts: CustomEvent[] = [];
    const drags: CustomEvent[] = [];
    const ends: CustomEvent[] = [];
    item.addEventListener("draggable:start", (e) =>
      starts.push(e as CustomEvent),
    );
    item.addEventListener("draggable:drag", (e) =>
      drags.push(e as CustomEvent),
    );
    item.addEventListener("draggable:end", (e) => ends.push(e as CustomEvent));

    fireDrag(item, "dragstart", { clientX: 5, clientY: 6 });
    expect(item.classList.contains("is-dragging")).toBe(true);
    expect(item.getAttribute("aria-grabbed")).toBe("true");
    expect(starts).toHaveLength(1);

    fireDrag(item, "drag", { clientX: 25, clientY: 26 });
    expect(drags).toHaveLength(1);
    expect(drags[0]!.detail.delta).toEqual({ x: 20, y: 20 });

    fireDrag(item, "dragend", { clientX: 30, clientY: 40 });
    expect(item.classList.contains("is-dragging")).toBe(false);
    expect(item.classList.contains("is-dropped")).toBe(true);
    expect(item.getAttribute("aria-grabbed")).toBe("false");
    expect(ends).toHaveLength(1);

    // is-dropped clears after 300 ms.
    vi.advanceTimersByTime(300);
    expect(item.classList.contains("is-dropped")).toBe(false);
    vi.useRealTimers();
  });

  it("uses data-draggable then text as the drop payload", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable-container">
         <div class="vd-draggable-item" data-draggable="explicit">X</div>
         <div class="vd-draggable-item">  Trimmed Text  </div>
       </div>`,
      useDraggable,
    );
    const [withData, withoutData] = wrapper
      .findAll(".vd-draggable-item")
      .map((w) => w.element);

    fireDrag(withData!, "dragstart", { clientX: 1, clientY: 1 });
    const starts: CustomEvent[] = [];
    withoutData!.addEventListener("draggable:start", (e) =>
      starts.push(e as CustomEvent),
    );
    fireDrag(withoutData!, "dragstart", { clientX: 1, clientY: 1 });
    expect(starts[0]!.detail.data).toBe("Trimmed Text");
  });

  it("live-reorders a vertical container by the sibling midpoint", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable-container vd-draggable-container-vertical">
         <div class="vd-draggable-item" id="a">A</div>
         <div class="vd-draggable-item" id="b">B</div>
         <div class="vd-draggable-item" id="c">C</div>
       </div>`,
      useDraggable,
    );
    const container = wrapper.get(".vd-draggable-container").element;
    const a = wrapper.get("#a").element;
    stubRect(wrapper.get("#a").element, {
      top: 0,
      left: 0,
      width: 40,
      height: 20,
    });
    stubRect(wrapper.get("#b").element, {
      top: 20,
      left: 0,
      width: 40,
      height: 20,
    });
    stubRect(wrapper.get("#c").element, {
      top: 40,
      left: 0,
      width: 40,
      height: 20,
    });

    fireDrag(a, "dragstart", { clientX: 0, clientY: 5 });
    // Drop below B's vertical midpoint (30) -> A re-inserts after B.
    fireDrag(container, "dragover", { clientX: 0, clientY: 35 });

    const order = [...container.querySelectorAll(".vd-draggable-item")].map(
      (el) => el.id,
    );
    expect(order).toEqual(["b", "a", "c"]);
  });

  it("ignores the (0,0) end-of-drag dragover coordinates", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable-container vd-draggable-container-vertical">
         <div class="vd-draggable-item" id="a">A</div>
         <div class="vd-draggable-item" id="b">B</div>
       </div>`,
      useDraggable,
    );
    const container = wrapper.get(".vd-draggable-container").element;
    const a = wrapper.get("#a").element;
    stubRect(a, { top: 0, left: 0, width: 40, height: 20 });
    stubRect(wrapper.get("#b").element, {
      top: 20,
      left: 0,
      width: 40,
      height: 20,
    });

    fireDrag(a, "dragstart", { clientX: 0, clientY: 5 });
    fireDrag(container, "dragover", { clientX: 0, clientY: 0 });

    const order = [...container.querySelectorAll(".vd-draggable-item")].map(
      (el) => el.id,
    );
    expect(order).toEqual(["a", "b"]);
  });

  it("live-reorders a horizontal container by the X midpoint", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable-container">
         <div class="vd-draggable-item" id="a">A</div>
         <div class="vd-draggable-item" id="b">B</div>
         <div class="vd-draggable-item" id="c">C</div>
       </div>`,
      useDraggable,
    );
    const container = wrapper.get(".vd-draggable-container").element;
    const a = wrapper.get("#a").element;
    stubRect(a, { top: 0, left: 0, width: 20, height: 20 });
    stubRect(wrapper.get("#b").element, {
      top: 0,
      left: 20,
      width: 20,
      height: 20,
    });
    stubRect(wrapper.get("#c").element, {
      top: 0,
      left: 40,
      width: 20,
      height: 20,
    });

    fireDrag(a, "dragstart", { clientX: 5, clientY: 0 });
    // Past B's horizontal midpoint (30) -> A after B.
    fireDrag(container, "dragover", { clientX: 35, clientY: 0 });

    const order = [...container.querySelectorAll(".vd-draggable-item")].map(
      (el) => el.id,
    );
    expect(order).toEqual(["b", "a", "c"]);
  });

  it("performs the drop-zone handshake and dispatches draggable:drop", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable" data-draggable="x">Item</div>
       <div class="vd-drop-zone">Zone</div>`,
      useDraggable,
    );
    const item = wrapper.get(".vd-draggable").element;
    const zone = wrapper.get(".vd-drop-zone").element;
    const drops: CustomEvent[] = [];
    zone.addEventListener("draggable:drop", (e) =>
      drops.push(e as CustomEvent),
    );

    fireDrag(item, "dragstart", { clientX: 1, clientY: 1 });
    fireDrag(zone, "dragenter", { clientX: 10, clientY: 10 });
    expect(zone.classList.contains("is-drag-over")).toBe(true);

    fireDrag(zone, "drop", { clientX: 12, clientY: 14 });
    expect(zone.classList.contains("is-drag-over")).toBe(false);
    expect(drops).toHaveLength(1);
    expect(drops[0]!.detail.data).toBe("x");
    expect(drops[0]!.detail.element).toBe(item);
    expect(drops[0]!.detail.position).toEqual({ x: 12, y: 14 });
  });

  it("clears is-drag-over on dragleave", () => {
    const { wrapper } = mountHost(
      `<div class="vd-drop-zone"></div>`,
      useDraggable,
    );
    const zone = wrapper.get(".vd-drop-zone").element;
    fireDrag(zone, "dragenter");
    expect(zone.classList.contains("is-drag-over")).toBe(true);
    fireDrag(zone, "dragleave");
    expect(zone.classList.contains("is-drag-over")).toBe(false);
  });

  it("keyboard-reorders up (before the previous sibling) and fires draggable:reorder", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable-container">
         <div class="vd-draggable-item" id="a">A</div>
         <div class="vd-draggable-item" id="b">B</div>
         <div class="vd-draggable-item" id="c">C</div>
       </div>`,
      useDraggable,
    );
    const container = wrapper.get(".vd-draggable-container").element;
    const b = wrapper.get("#b").element as HTMLElement;
    const reorders: CustomEvent[] = [];
    b.addEventListener("draggable:reorder", (e) =>
      reorders.push(e as CustomEvent),
    );

    b.focus();
    b.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
    );

    const order = [...container.querySelectorAll(".vd-draggable-item")].map(
      (el) => el.id,
    );
    expect(order).toEqual(["b", "a", "c"]);
    expect(document.activeElement).toBe(b);
    expect(reorders).toHaveLength(1);
    expect(reorders[0]!.detail.direction).toBe("up");
  });

  it("keyboard-reorders down (after the next sibling)", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable-container">
         <div class="vd-draggable-item" id="a">A</div>
         <div class="vd-draggable-item" id="b">B</div>
         <div class="vd-draggable-item" id="c">C</div>
       </div>`,
      useDraggable,
    );
    const container = wrapper.get(".vd-draggable-container").element;
    const b = wrapper.get("#b").element;
    const reorders: CustomEvent[] = [];
    b.addEventListener("draggable:reorder", (e) =>
      reorders.push(e as CustomEvent),
    );

    b.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );

    const order = [...container.querySelectorAll(".vd-draggable-item")].map(
      (el) => el.id,
    );
    expect(order).toEqual(["a", "c", "b"]);
    expect(reorders[0]!.detail.direction).toBe("down");
  });

  it("Enter activates the item's click and Escape cancels an in-progress drag", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable">Item</div>`,
      useDraggable,
    );
    const item = wrapper.get(".vd-draggable").element;
    let clicked = 0;
    item.addEventListener("click", () => (clicked += 1));

    item.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(clicked).toBe(1);

    fireDrag(item, "dragstart", { clientX: 0, clientY: 0 });
    expect(item.classList.contains("is-dragging")).toBe(true);
    item.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(item.classList.contains("is-dragging")).toBe(false);
    expect(item.getAttribute("aria-grabbed")).toBe("false");
  });

  it("touchmove past the threshold starts a drag and moves the feedback ghost", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable">A</div>`,
      useDraggable,
    );
    const item = wrapper.get(".vd-draggable").element;
    stubRect(item, { top: 0, left: 0, width: 40, height: 20 });
    const starts: CustomEvent[] = [];
    item.addEventListener("draggable:start", (e) =>
      starts.push(e as CustomEvent),
    );

    fireTouch(item, "touchstart", { clientX: 0, clientY: 0 });
    // Under threshold: nothing yet.
    fireTouch(item, "touchmove", { clientX: 4, clientY: 0 });
    expect(item.classList.contains("is-dragging")).toBe(false);

    // Past 10px threshold: drag begins, ghost becomes visible + positioned.
    const moveEv = fireTouch(item, "touchmove", { clientX: 40, clientY: 8 });
    expect(moveEv.defaultPrevented).toBe(true);
    expect(item.classList.contains("is-dragging")).toBe(true);
    expect(starts).toHaveLength(1);

    const ghost =
      document.body.querySelector<HTMLElement>(".vd-drag-feedback")!;
    expect(ghost.classList.contains("hidden")).toBe(false);
    expect(ghost.style.left).toBe("40px");

    fireTouch(item, "touchend", { clientX: 40, clientY: 8 });
    expect(item.classList.contains("is-dragging")).toBe(false);
    expect(item.classList.contains("is-dropped")).toBe(true);
  });

  it("makeDraggable/removeDraggable promote and tear down an element", () => {
    const { wrapper, api } = mountHost(
      `<div id="plain">Plain</div>`,
      useDraggable,
    );
    const el = wrapper.get("#plain").element as HTMLElement;

    api.makeDraggable(el, { data: "made" });
    expect(el.classList.contains("vd-draggable")).toBe(true);
    expect(el.getAttribute("draggable")).toBe("true");
    expect(el.dataset.draggable).toBe("made");
    expect(el.getAttribute("role")).toBe("option");

    const starts: CustomEvent[] = [];
    el.addEventListener("draggable:start", (e) =>
      starts.push(e as CustomEvent),
    );
    fireDrag(el, "dragstart", { clientX: 0, clientY: 0 });
    expect(starts).toHaveLength(1);

    api.removeDraggable(el);
    expect(el.classList.contains("vd-draggable")).toBe(false);
    expect(el.hasAttribute("draggable")).toBe(false);
    fireDrag(el, "dragstart", { clientX: 0, clientY: 0 });
    // Listener removed: no new event.
    expect(starts).toHaveLength(1);
  });

  it("tears down item listeners and removes the feedback ghost on unmount", () => {
    const { wrapper } = mountHost(
      `<div class="vd-draggable">A</div>`,
      useDraggable,
    );
    const item = wrapper.get(".vd-draggable").element;
    expect(document.body.querySelector(".vd-drag-feedback")).not.toBeNull();

    // Wired before unmount.
    fireDrag(item, "dragstart", { clientX: 0, clientY: 0 });
    expect(item.classList.contains("is-dragging")).toBe(true);
    item.classList.remove("is-dragging");

    wrapper.unmount();

    // Listener detached after unmount: dragstart no longer re-adds the class.
    fireDrag(item, "dragstart", { clientX: 0, clientY: 0 });
    expect(item.classList.contains("is-dragging")).toBe(false);
    expect(document.body.querySelector(".vd-drag-feedback")).toBeNull();
  });

  it("keeps the shared feedback ghost until the last instance unmounts", () => {
    const a = mountHost(`<div class="vd-draggable-item">A</div>`, useDraggable);
    const b = mountHost(`<div class="vd-draggable-item">B</div>`, useDraggable);
    expect(document.body.querySelectorAll(".vd-drag-feedback")).toHaveLength(1);

    a.wrapper.unmount();
    // One instance remains -> ghost stays.
    expect(document.body.querySelector(".vd-drag-feedback")).not.toBeNull();

    b.wrapper.unmount();
    expect(document.body.querySelector(".vd-drag-feedback")).toBeNull();
  });
});
