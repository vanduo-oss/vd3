import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Position of a pointer/drop in viewport coordinates.
 */
export interface DraggablePosition {
  x: number;
  y: number;
}

/**
 * Optional controller returned by {@link useDraggable}. vd3 extension — the
 * old shim returned `void`, so shim-compatible callers may ignore this.
 */
export interface DraggableApi {
  /**
   * Promote an element (or selector, resolved against the document) to a
   * `.vd-draggable` and wire it — mirrors the framework's
   * `makeDraggable(el, opts)`. `options.data` seeds `data-draggable`.
   * vd3 extension.
   */
  makeDraggable(target: Element | string, options?: { data?: string }): void;
  /**
   * Tear down and de-class a draggable previously wired by this instance —
   * mirrors the framework's `removeDraggable(el)`. vd3 extension.
   */
  removeDraggable(target: Element | string): void;
  /**
   * Re-scan the root and wire any newly added draggable items, containers,
   * or drop zones (idempotent — safe after v-for re-renders). vd3 extension.
   */
  refresh(): void;
}

const CONTAINER_SELECTOR =
  ".vd-draggable-container, .vd-draggable-container-vertical";
const ITEM_SELECTOR = ".vd-draggable, [data-draggable]";

// Refcounted, body-level drag-feedback ghost shared across every mounted
// `useDraggable` instance (the vanilla layer used a single global element).
// Module scope holds only null/0 — no DOM access here, so SSR is safe;
// `acquireFeedback` runs first inside onMounted.
let feedbackEl: HTMLElement | null = null;
let feedbackRefCount = 0;

function acquireFeedback(): HTMLElement {
  if (!feedbackEl) {
    const existing = document.querySelector<HTMLElement>(".vd-drag-feedback");
    if (existing) {
      feedbackEl = existing;
    } else {
      feedbackEl = document.createElement("div");
      feedbackEl.className = "vd-drag-feedback hidden";
      feedbackEl.setAttribute("role", "presentation");
      document.body.appendChild(feedbackEl);
    }
  }
  feedbackRefCount += 1;
  return feedbackEl;
}

function releaseFeedback(): void {
  feedbackRefCount = Math.max(0, feedbackRefCount - 1);
  if (feedbackRefCount === 0 && feedbackEl) {
    feedbackEl.remove();
    feedbackEl = null;
  }
}

interface DragState {
  element: HTMLElement;
  initialPosition: DraggablePosition;
  initialBounds: DOMRect;
  data: string;
  offsetX?: number;
  offsetY?: number;
}

interface TouchState {
  element: HTMLElement;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  offsetX: number;
  offsetY: number;
  startTime: number;
  isDragging: boolean;
  overZone?: HTMLElement | null;
}

/**
 * Ports framework/js/components/draggable.js — scans `root` for
 * `.vd-draggable` / `[data-draggable]` items, `.vd-draggable-container`
 * (+ `-vertical`) sortable listboxes, and `.vd-drop-zone` targets, wiring the
 * full HTML5-drag + touch experience:
 *
 * - **Items** get `draggable="true"`, `tabindex="0"`, `role="option"`,
 *   `aria-roledescription="draggable item"`, and `aria-grabbed`. `dragstart`
 *   applies `is-dragging` + `aria-grabbed="true"` and fires `draggable:start`;
 *   `drag` fires `draggable:drag`; `dragend` swaps in a transient `is-dropped`
 *   (removed after 300 ms), resets `aria-grabbed`, and fires `draggable:end`.
 *   Drop payload is `data-draggable`, falling back to trimmed text.
 * - **Containers** become `role="listbox"` (default `aria-label`), auto-wire
 *   their `.vd-draggable-item` children, and live-reorder the dragged item on
 *   `dragover` by the sibling-midpoint rule (vertical compares Y, horizontal
 *   X), ignoring the (0,0) end-of-drag coordinates.
 * - **Drop zones** become `role="region"` with `aria-dropeffect="move"` and a
 *   default `aria-label`; `dragenter` adds `is-drag-over`, `dragleave` clears
 *   it, and `drop` clears it and fires `draggable:drop` with the item data and
 *   drop position.
 * - **Touch fallback**: `touchmove` past a 10px threshold mirrors dragstart
 *   (preventing scroll), moves the body-level `.vd-drag-feedback` ghost with
 *   the finger, live-toggles `is-drag-over` on the zone under the touch point,
 *   and `touchend` performs the drop/reorder + cleanup.
 * - **Keyboard**: Enter/Space activates the item's click; ArrowUp/ArrowLeft
 *   and ArrowDown/ArrowRight move the item before/after its draggable sibling,
 *   keep focus, and fire `draggable:reorder` with the direction; Escape cancels
 *   an in-progress drag.
 *
 * The vanilla-only concerns (DOM auto-scan/`Vanduo.register`, the global
 * instances registry, and `window.VanduoDraggable`) are dropped; state is
 * closure-scoped to this composable and the feedback ghost is refcounted so it
 * is removed once no instance remains. Returns a {@link DraggableApi}
 * controller (vd3 extension — ignore it for shim-compatible usage).
 */
export function useDraggable(root: Ref<HTMLElement | null>): DraggableApi {
  const instances = new Map<Element, { cleanup: Array<() => void> }>();
  const timers = new Set<number>();
  let currentDrag: DragState | null = null;
  let touchState: TouchState | null = null;
  let feedbackAcquired = false;

  const getData = (element: HTMLElement): string =>
    element.dataset.draggable || (element.textContent ?? "").trim();

  const scheduleDroppedReset = (element: HTMLElement): void => {
    const t = window.setTimeout(() => {
      element.classList.remove("is-dropped");
      timers.delete(t);
    }, 300);
    timers.add(t);
  };

  // ── Drag ghost ────────────────────────────────────────────────
  const updateFeedback = (x: number, y: number): void => {
    if (!currentDrag || !feedbackEl) return;
    feedbackEl.classList.remove("hidden");
    const rect = currentDrag.initialBounds;
    feedbackEl.innerHTML = "";
    feedbackEl.appendChild(currentDrag.element.cloneNode(true));
    const offsetX = currentDrag.offsetX ?? 20;
    const offsetY = currentDrag.offsetY ?? 20;
    Object.assign(feedbackEl.style, {
      left: x - offsetX + "px",
      top: y - offsetY + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
  };

  const hideFeedback = (): void => {
    if (feedbackEl) feedbackEl.classList.add("hidden");
  };

  // ── Drop-zone resolution ──────────────────────────────────────
  const resolveDropZoneAtPoint = (x: number, y: number): HTMLElement | null => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    if (typeof document.elementsFromPoint === "function") {
      const stacked = document.elementsFromPoint(x, y);
      for (const element of stacked) {
        const zone = element.closest<HTMLElement>(".vd-drop-zone");
        if (zone) return zone;
      }
    }

    const target =
      typeof document.elementFromPoint === "function"
        ? document.elementFromPoint(x, y)
        : null;
    const targetZone = target
      ? target.closest<HTMLElement>(".vd-drop-zone")
      : null;
    if (targetZone) return targetZone;

    const zones = document.querySelectorAll<HTMLElement>(".vd-drop-zone");
    for (const zone of zones) {
      const rect = zone.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return zone;
      }
    }
    return null;
  };

  const updateTouchDropZone = (x: number, y: number): void => {
    if (!touchState) return;
    const nextZone = resolveDropZoneAtPoint(x, y);
    const prevZone = touchState.overZone || null;
    if (prevZone && prevZone !== nextZone) {
      prevZone.classList.remove("is-drag-over");
    }
    if (nextZone && nextZone !== prevZone) {
      nextZone.classList.add("is-drag-over");
    }
    touchState.overZone = nextZone || null;
  };

  const dispatchDrop = (
    zone: HTMLElement,
    position: DraggablePosition,
  ): void => {
    zone.classList.remove("is-drag-over");
    zone.dispatchEvent(
      new CustomEvent("draggable:drop", {
        bubbles: true,
        detail: {
          zone,
          element: currentDrag?.element,
          data: currentDrag?.data,
          position,
        },
      }),
    );
  };

  // ── Sortable reorder (sibling-midpoint rule) ──────────────────
  const handleReorder = (
    container: HTMLElement,
    element: HTMLElement,
    clientX: number,
    clientY: number,
  ): void => {
    const isVertical = container.classList.contains(
      "vd-draggable-container-vertical",
    );
    const siblings = [
      ...container.querySelectorAll<HTMLElement>(
        ".vd-draggable-item:not(.is-dragging), .vd-draggable:not(.is-dragging)",
      ),
    ];

    const nextSibling = siblings.reduce<{
      offset: number;
      element?: HTMLElement;
    }>(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = isVertical
          ? clientY - box.top - box.height / 2
          : clientX - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY },
    ).element;

    if (nextSibling == null) {
      container.appendChild(element);
    } else {
      container.insertBefore(element, nextSibling);
    }
  };

  // ── Item drag lifecycle ───────────────────────────────────────
  const handleDragStart = (e: DragEvent, element: HTMLElement): void => {
    element.classList.add("is-dragging");
    element.setAttribute("aria-grabbed", "true");

    currentDrag = {
      element,
      initialPosition: { x: e.clientX, y: e.clientY },
      initialBounds: element.getBoundingClientRect(),
      data: getData(element),
    };

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", currentDrag.data);
    }

    element.dispatchEvent(
      new CustomEvent("draggable:start", {
        bubbles: true,
        detail: {
          element,
          data: currentDrag.data,
          position: { x: e.clientX, y: e.clientY },
        },
      }),
    );
  };

  const handleDrag = (e: DragEvent, element: HTMLElement): void => {
    if (!currentDrag) return;
    element.dispatchEvent(
      new CustomEvent("draggable:drag", {
        bubbles: true,
        detail: {
          element,
          data: currentDrag.data,
          position: { x: e.clientX, y: e.clientY },
          delta: {
            x: e.clientX - currentDrag.initialPosition.x,
            y: e.clientY - currentDrag.initialPosition.y,
          },
        },
      }),
    );
  };

  const handleDragEnd = (e: DragEvent, element: HTMLElement): void => {
    element.classList.remove("is-dragging");
    element.classList.add("is-dropped");
    scheduleDroppedReset(element);
    element.setAttribute("aria-grabbed", "false");
    hideFeedback();

    const data = currentDrag?.data ?? getData(element);
    const initialPos = currentDrag?.initialPosition ?? { x: 0, y: 0 };

    element.dispatchEvent(
      new CustomEvent("draggable:end", {
        bubbles: true,
        detail: {
          element,
          data,
          position: { x: e.clientX, y: e.clientY },
          delta: {
            x: e.clientX - initialPos.x,
            y: e.clientY - initialPos.y,
          },
        },
      }),
    );

    currentDrag = null;
  };

  // ── Touch fallback ────────────────────────────────────────────
  const handleTouchStart = (e: TouchEvent, element: HTMLElement): void => {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = element.getBoundingClientRect();
    touchState = {
      element,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
      startTime: Date.now(),
      isDragging: false,
    };
  };

  const handleTouchMove = (e: TouchEvent, element: HTMLElement): void => {
    if (!touchState) return;
    const touch = e.touches[0];
    if (!touch) return;
    touchState.lastX = touch.clientX;
    touchState.lastY = touch.clientY;
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (e.cancelable) e.preventDefault();

      if (!touchState.isDragging) {
        touchState.isDragging = true;
        element.classList.add("is-dragging");
        element.setAttribute("aria-grabbed", "true");

        currentDrag = {
          element,
          initialPosition: { x: touchState.startX, y: touchState.startY },
          initialBounds: element.getBoundingClientRect(),
          data: getData(element),
          offsetX: touchState.offsetX,
          offsetY: touchState.offsetY,
        };

        element.dispatchEvent(
          new CustomEvent("draggable:start", {
            bubbles: true,
            detail: {
              element,
              data: currentDrag.data,
              position: { x: touch.clientX, y: touch.clientY },
            },
          }),
        );
      }

      updateFeedback(touch.clientX, touch.clientY);

      if (currentDrag) {
        element.dispatchEvent(
          new CustomEvent("draggable:drag", {
            bubbles: true,
            detail: {
              element,
              data: currentDrag.data,
              position: { x: touch.clientX, y: touch.clientY },
              delta: { x: deltaX, y: deltaY },
            },
          }),
        );

        updateTouchDropZone(touch.clientX, touch.clientY);

        const container = element.closest<HTMLElement>(CONTAINER_SELECTOR);
        if (container && container.contains(element)) {
          handleReorder(container, element, touch.clientX, touch.clientY);
        }
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent, element: HTMLElement): void => {
    if (touchState && touchState.isDragging) {
      if (e.cancelable) e.preventDefault();
      const endTouch = e.changedTouches?.[0];
      const endPosition: DraggablePosition = {
        x: endTouch?.clientX ?? touchState.lastX ?? touchState.startX,
        y: endTouch?.clientY ?? touchState.lastY ?? touchState.startY,
      };

      const dropZone =
        resolveDropZoneAtPoint(endPosition.x, endPosition.y) ||
        touchState.overZone;
      if (dropZone) {
        dispatchDrop(dropZone, endPosition);
      } else if (touchState.overZone) {
        touchState.overZone.classList.remove("is-drag-over");
      }

      element.classList.remove("is-dragging");
      element.classList.add("is-dropped");
      element.setAttribute("aria-grabbed", "false");
      scheduleDroppedReset(element);
      hideFeedback();

      const data = currentDrag?.data ?? getData(element);
      const startX = touchState?.startX ?? 0;
      const startY = touchState?.startY ?? 0;

      element.dispatchEvent(
        new CustomEvent("draggable:end", {
          bubbles: true,
          detail: {
            element,
            data,
            position: endPosition,
            delta: {
              x: endPosition.x - startX,
              y: endPosition.y - startY,
            },
          },
        }),
      );
    }

    touchState = null;
    currentDrag = null;
  };

  // ── Keyboard ──────────────────────────────────────────────────
  const handleKeydown = (e: KeyboardEvent, element: HTMLElement): void => {
    const isDraggableSibling = (node: Element | null): node is Element =>
      !!node &&
      (node.classList.contains("vd-draggable") ||
        node.classList.contains("vd-draggable-item"));

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        element.click();
        break;
      case "Escape":
        if (element.classList.contains("is-dragging")) {
          element.classList.remove("is-dragging");
          element.setAttribute("aria-grabbed", "false");
          hideFeedback();
          currentDrag = null;
        }
        break;
      case "ArrowUp":
      case "ArrowLeft": {
        e.preventDefault();
        const prev = element.previousElementSibling;
        if (isDraggableSibling(prev)) {
          element.parentNode?.insertBefore(element, prev);
          element.focus();
          element.dispatchEvent(
            new CustomEvent("draggable:reorder", {
              bubbles: true,
              detail: { element, direction: "up" },
            }),
          );
        }
        break;
      }
      case "ArrowDown":
      case "ArrowRight": {
        e.preventDefault();
        const next = element.nextElementSibling;
        if (isDraggableSibling(next)) {
          element.parentNode?.insertBefore(next, element);
          element.focus();
          element.dispatchEvent(
            new CustomEvent("draggable:reorder", {
              bubbles: true,
              detail: { element, direction: "down" },
            }),
          );
        }
        break;
      }
    }
  };

  // ── Wiring ────────────────────────────────────────────────────
  const initDraggable = (element: HTMLElement): void => {
    if (instances.has(element)) return;
    const cleanup: Array<() => void> = [];

    if (!element.hasAttribute("draggable")) {
      element.setAttribute("draggable", "true");
    }
    if (!element.hasAttribute("tabindex")) {
      element.setAttribute("tabindex", "0");
    }
    element.setAttribute("role", "option");
    element.setAttribute("aria-roledescription", "draggable item");
    element.setAttribute("aria-grabbed", "false");

    const onDragStart = (e: Event): void =>
      handleDragStart(e as DragEvent, element);
    const onDrag = (e: Event): void => handleDrag(e as DragEvent, element);
    const onDragEnd = (e: Event): void =>
      handleDragEnd(e as DragEvent, element);
    const onTouchStart = (e: Event): void =>
      handleTouchStart(e as TouchEvent, element);
    const onTouchMove = (e: Event): void =>
      handleTouchMove(e as TouchEvent, element);
    const onTouchEnd = (e: Event): void =>
      handleTouchEnd(e as TouchEvent, element);
    const onKeydown = (e: Event): void =>
      handleKeydown(e as KeyboardEvent, element);

    element.addEventListener("dragstart", onDragStart);
    element.addEventListener("drag", onDrag);
    element.addEventListener("dragend", onDragEnd);
    element.addEventListener("touchstart", onTouchStart);
    // { passive: false } lets preventDefault() suppress scroll once the drag
    // threshold is crossed — modern browsers ignore it on passive listeners.
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd, { passive: false });
    element.addEventListener("touchcancel", onTouchEnd);
    element.addEventListener("keydown", onKeydown);

    cleanup.push(
      () => element.removeEventListener("dragstart", onDragStart),
      () => element.removeEventListener("drag", onDrag),
      () => element.removeEventListener("dragend", onDragEnd),
      () => element.removeEventListener("touchstart", onTouchStart),
      () => element.removeEventListener("touchmove", onTouchMove),
      () => element.removeEventListener("touchend", onTouchEnd),
      () => element.removeEventListener("touchcancel", onTouchEnd),
      () => element.removeEventListener("keydown", onKeydown),
    );

    instances.set(element, { cleanup });
  };

  const initContainer = (container: HTMLElement): void => {
    if (instances.has(container)) return;

    container.setAttribute("role", "listbox");
    container.setAttribute(
      "aria-label",
      container.getAttribute("aria-label") || "Draggable items",
    );

    container
      .querySelectorAll<HTMLElement>(".vd-draggable-item")
      .forEach((item) => initDraggable(item));

    const cleanup: Array<() => void> = [];

    const onDragEnter = (e: DragEvent): void => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    };
    const onDragOver = (e: DragEvent): void => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      if (!currentDrag) return;
      const draggingEl = currentDrag.element;
      if (!container.contains(draggingEl)) return;
      // Ignore the (0,0) coordinates the browser reports as a drag finalizes.
      if (e.clientX === 0 && e.clientY === 0) return;
      handleReorder(container, draggingEl, e.clientX, e.clientY);
    };
    const onDrop = (e: DragEvent): void => {
      e.preventDefault();
    };

    container.addEventListener("dragenter", onDragEnter as EventListener);
    container.addEventListener("dragover", onDragOver as EventListener);
    container.addEventListener("drop", onDrop as EventListener);

    cleanup.push(() => {
      container.removeEventListener("dragenter", onDragEnter as EventListener);
      container.removeEventListener("dragover", onDragOver as EventListener);
      container.removeEventListener("drop", onDrop as EventListener);
    });

    instances.set(container, { cleanup });
  };

  const initDropZone = (zone: HTMLElement): void => {
    if (instances.has(zone)) return;
    const cleanup: Array<() => void> = [];

    zone.setAttribute("role", "region");
    zone.setAttribute("aria-dropeffect", "move");
    if (!zone.hasAttribute("aria-label")) {
      zone.setAttribute("aria-label", "Drop zone");
    }

    const onDragOver = (e: DragEvent): void => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    };
    const onDragEnter = (e: DragEvent): void => {
      e.preventDefault();
      zone.classList.add("is-drag-over");
    };
    const onDragLeave = (): void => {
      zone.classList.remove("is-drag-over");
    };
    const onDrop = (e: DragEvent): void => {
      e.preventDefault();
      dispatchDrop(zone, { x: e.clientX, y: e.clientY });
    };

    zone.addEventListener("dragover", onDragOver as EventListener);
    zone.addEventListener("dragenter", onDragEnter as EventListener);
    zone.addEventListener("dragleave", onDragLeave);
    zone.addEventListener("drop", onDrop as EventListener);

    cleanup.push(
      () => zone.removeEventListener("dragover", onDragOver as EventListener),
      () => zone.removeEventListener("dragenter", onDragEnter as EventListener),
      () => zone.removeEventListener("dragleave", onDragLeave),
      () => zone.removeEventListener("drop", onDrop as EventListener),
    );

    instances.set(zone, { cleanup });
  };

  const teardownInstance = (el: Element): void => {
    const instance = instances.get(el);
    if (!instance) return;
    instance.cleanup.forEach((fn) => fn());
    instances.delete(el);
  };

  const refresh = (): void => {
    if (typeof window === "undefined") return;
    const host = root.value;
    if (!host) return;

    host
      .querySelectorAll<HTMLElement>(ITEM_SELECTOR)
      .forEach((el) => initDraggable(el));
    host
      .querySelectorAll<HTMLElement>(CONTAINER_SELECTOR)
      .forEach((el) => initContainer(el));
    host
      .querySelectorAll<HTMLElement>(".vd-drop-zone")
      .forEach((el) => initDropZone(el));

    if (!feedbackAcquired) {
      acquireFeedback();
      feedbackAcquired = true;
    }
  };

  const makeDraggable = (
    target: Element | string,
    options: { data?: string } = {},
  ): void => {
    if (typeof window === "undefined") return;
    const el =
      typeof target === "string"
        ? document.querySelector<HTMLElement>(target)
        : (target as HTMLElement);
    if (el && !instances.has(el)) {
      el.classList.add("vd-draggable");
      el.setAttribute("draggable", "true");
      if (options.data) el.dataset.draggable = options.data;
      initDraggable(el);
    }
  };

  const removeDraggable = (target: Element | string): void => {
    if (typeof window === "undefined") return;
    const el =
      typeof target === "string"
        ? document.querySelector<HTMLElement>(target)
        : (target as HTMLElement);
    if (el && instances.has(el)) {
      teardownInstance(el);
      el.classList.remove("vd-draggable");
      el.removeAttribute("draggable");
      el.removeAttribute("data-draggable");
    }
  };

  onMounted(refresh);

  onUnmounted(() => {
    instances.forEach((_, el) => teardownInstance(el));
    instances.clear();
    timers.forEach((t) => window.clearTimeout(t));
    timers.clear();
    currentDrag = null;
    touchState = null;
    if (feedbackAcquired) {
      releaseFeedback();
      feedbackAcquired = false;
    }
  });

  return { makeDraggable, removeDraggable, refresh };
}
