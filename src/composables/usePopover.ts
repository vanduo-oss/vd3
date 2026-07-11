import { onMounted, onScopeDispose, type Ref } from "vue";
import { sanitizeHtml } from "../utils/sanitizeHtml";

/**
 * Merges `framework/js/components/bubble.js` and
 * `framework/js/components/popover.js` behind the old shim's single
 * `usePopover(root)` API, dispatching on markup inside `root`:
 *
 * 1. **Attribute-built bubble** — a trigger with `data-vd-bubble` /
 *    `data-vd-popover` (and *no* `data-vd-popover-target`) gets a
 *    body-appended `.vd-bubble-content` dialog built from its attributes
 *    (`-title` header + close button, `-placement`, `-html` content run
 *    through `sanitizeHtml` with `allowStyle: false` and SVG only via the
 *    `-allow-svg` attribute). Click toggles; opening closes other bubbles;
 *    outside click (capture) and Escape dismiss; `bubble:show` /
 *    `bubble:hide` dispatch from the trigger.
 * 2. **Target-panel popover** — a `.vd-popover-trigger` /
 *    `[data-vd-popover-target]` trigger adopts its pre-authored panel
 *    (ensures `.vd-popover-panel`, id, `role="dialog"`,
 *    `aria-modal="false"`) with trigger modes from
 *    `data-vd-popover-trigger` (`click` | `hover` — 80 ms leave grace — |
 *    `focus` — related-target check; default `click focus`), placement
 *    from `data-vd-popover-placement` (invalid → `bottom`) mirrored to
 *    `data-placement`, viewport clamping, and overflow flip on
 *    resize/scroll unless `data-vd-popover-flip="false"`. Escape closes
 *    the open panel; `popover:show` / `popover:hide` dispatch from the
 *    trigger. Vanilla parity note: only pure `click`-mode panels dismiss
 *    on outside click.
 *
 * Divergences from the vanilla donors (documented improvements): teardown
 * is per-instance (no `destroyAll()` nuking siblings), and dismissal
 * handlers only fire hide events for bubbles/panels that are actually
 * open (the vanilla dispatched spurious `*:hide` on every outside click).
 *
 * vd3 extensions: an optional `options` object of defaults for the data-*
 * attributes and a returned controller (`show` / `hide` / `hideAll` /
 * `refresh`) — old `usePopover(root)` call sites compile and behave
 * unchanged.
 */

const PLACEMENTS = ["top", "bottom", "left", "right"] as const;
export type PopoverPlacement = (typeof PLACEMENTS)[number];

const TRIGGER_MODES = ["click", "hover", "focus"];
const BUBBLE_GAP = 10;
const PANEL_GAP = 8;

export interface UsePopoverOptions {
  /**
   * vd3 extension: fallback placement when a trigger has no placement
   * attribute (bubbles) or an invalid/missing `data-vd-popover-placement`
   * (panels). Default `"bottom"`.
   */
  placement?: PopoverPlacement;
  /**
   * vd3 extension: fallback trigger modes for panel popovers without a
   * `data-vd-popover-trigger` attribute — a space-separated combination of
   * `click`, `hover`, `focus`. Default `"click focus"`.
   */
  trigger?: string;
  /**
   * vd3 extension: default overflow-flip allowance for panel popovers
   * without a `data-vd-popover-flip` attribute. Default `true`.
   */
  flip?: boolean;
  /**
   * vd3 extension: grace period in milliseconds before a hover-mode panel
   * hides after the pointer leaves both trigger and panel. Default `80`.
   */
  hoverLeaveDelay?: number;
}

export interface UsePopoverController {
  /** vd3 extension: open the bubble/panel belonging to a wired trigger. */
  show(trigger: HTMLElement): void;
  /** vd3 extension: close the bubble/panel belonging to a wired trigger. */
  hide(trigger: HTMLElement): void;
  /** vd3 extension: close every bubble and panel wired by this instance. */
  hideAll(): void;
  /** vd3 extension: re-scan the root and wire triggers added since mount. */
  refresh(): void;
}

interface BubbleInstance {
  panel: HTMLElement;
  placement: string;
  cleanup: Array<() => void>;
}

interface PanelInstance {
  panel: HTMLElement;
  placement: string;
  /** Space-joined resolved modes — vanilla stored the same joined string. */
  modes: string;
  allowFlip: boolean;
  cleanup: Array<() => void>;
}

function uid(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function usePopover(
  root: Ref<HTMLElement | null>,
  options: UsePopoverOptions = {},
): UsePopoverController {
  const defaultPlacement: string = options.placement ?? "bottom";
  const defaultModes = options.trigger ?? "click focus";
  const defaultFlip = options.flip ?? true;
  const hoverLeaveDelay = options.hoverLeaveDelay ?? 80;

  const bubbles = new Map<HTMLElement, BubbleInstance>();
  const panels = new Map<HTMLElement, PanelInstance>();
  const globalCleanups: Array<() => void> = [];

  const resolvePanelPlacement = (attr: string | null): string =>
    attr && (PLACEMENTS as readonly string[]).includes(attr)
      ? attr
      : defaultPlacement;

  const resolveModes = (attr: string | null): string[] =>
    (attr ?? defaultModes)
      .split(/\s+/)
      .filter((mode) => TRIGGER_MODES.includes(mode));

  /** Shared bubble/panel positioning with the vanilla viewport clamp. */
  const place = (
    trigger: HTMLElement,
    panel: HTMLElement,
    placement: string,
    gap: number,
  ): void => {
    const rect = trigger.getBoundingClientRect();
    const popRect = panel.getBoundingClientRect();
    const win = panel.ownerDocument.defaultView ?? window;
    const scrollX = win.pageXOffset || 0;
    const scrollY = win.pageYOffset || 0;
    let top: number;
    let left: number;

    switch (placement) {
      case "top":
        top = rect.top - popRect.height - gap + scrollY;
        left = rect.left + (rect.width - popRect.width) / 2 + scrollX;
        break;
      case "left":
        top = rect.top + (rect.height - popRect.height) / 2 + scrollY;
        left = rect.left - popRect.width - gap + scrollX;
        break;
      case "right":
        top = rect.top + (rect.height - popRect.height) / 2 + scrollY;
        left = rect.right + gap + scrollX;
        break;
      default: // bottom
        top = rect.bottom + gap + scrollY;
        left = rect.left + (rect.width - popRect.width) / 2 + scrollX;
    }

    left = Math.max(8, Math.min(left, win.innerWidth - popRect.width - 8));
    top = Math.max(8, top);

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  };

  // ── Attribute-built bubble (bubble.js) ─────────────────────────

  const showBubble = (trigger: HTMLElement): void => {
    const inst = bubbles.get(trigger);
    if (!inst) return;
    inst.panel.style.display = "block";
    inst.panel.classList.add("is-visible");
    trigger.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => {
      place(trigger, inst.panel, inst.placement, BUBBLE_GAP);
    });
    trigger.dispatchEvent(
      new CustomEvent("bubble:show", {
        bubbles: true,
        detail: { trigger, placement: inst.placement },
      }),
    );
  };

  const hideBubble = (trigger: HTMLElement): void => {
    const inst = bubbles.get(trigger);
    if (!inst) return;
    inst.panel.classList.remove("is-visible");
    trigger.setAttribute("aria-expanded", "false");
    trigger.dispatchEvent(
      new CustomEvent("bubble:hide", { bubbles: true, detail: { trigger } }),
    );
  };

  const hideAllBubbles = (except?: HTMLElement): void => {
    bubbles.forEach((inst, trigger) => {
      if (trigger === except) return;
      if (inst.panel.classList.contains("is-visible")) hideBubble(trigger);
    });
  };

  const buildBubble = (trigger: HTMLElement): void => {
    const doc = trigger.ownerDocument;
    const cleanup: Array<() => void> = [];
    const placement =
      trigger.getAttribute("data-vd-bubble-placement") ??
      trigger.getAttribute("data-vd-popover-placement") ??
      defaultPlacement;

    const panel = doc.createElement("div");
    panel.className = "vd-bubble-content";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("data-placement", placement);

    const title =
      trigger.getAttribute("data-vd-bubble-title") ??
      trigger.getAttribute("data-vd-popover-title");
    const content =
      trigger.getAttribute("data-vd-bubble") ??
      trigger.getAttribute("data-vd-popover") ??
      "";
    const htmlContent =
      trigger.getAttribute("data-vd-bubble-html") ??
      trigger.getAttribute("data-vd-popover-html");
    const allowSvg =
      trigger.hasAttribute("data-vd-bubble-allow-svg") ||
      trigger.hasAttribute("data-vd-popover-allow-svg");

    if (title) {
      const header = doc.createElement("div");
      header.className = "vd-bubble-header";
      const titleSpan = doc.createElement("span");
      titleSpan.textContent = title;
      const closeBtn = doc.createElement("button");
      closeBtn.className = "vd-bubble-close";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.textContent = "×";
      header.appendChild(titleSpan);
      header.appendChild(closeBtn);
      panel.appendChild(header);

      const closeHandler = (e: Event): void => {
        e.stopPropagation();
        hideBubble(trigger);
      };
      closeBtn.addEventListener("click", closeHandler);
      cleanup.push(() => closeBtn.removeEventListener("click", closeHandler));
    }

    const body = doc.createElement("div");
    body.className = "vd-bubble-body";
    if (htmlContent) {
      body.innerHTML = sanitizeHtml(htmlContent, {
        allowSvg,
        allowStyle: false,
      });
    } else {
      body.textContent = content;
    }
    panel.appendChild(body);
    doc.body.appendChild(panel);

    panel.id = uid("vd-bubble-");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", panel.id);

    const toggleHandler = (e: Event): void => {
      e.stopPropagation();
      if (panel.classList.contains("is-visible")) {
        hideBubble(trigger);
      } else {
        hideAllBubbles(trigger);
        showBubble(trigger);
      }
    };
    trigger.addEventListener("click", toggleHandler);
    cleanup.push(() => trigger.removeEventListener("click", toggleHandler));

    bubbles.set(trigger, { panel, placement, cleanup });
  };

  const destroyBubble = (trigger: HTMLElement): void => {
    const inst = bubbles.get(trigger);
    if (!inst) return;
    inst.cleanup.forEach((fn) => fn());
    inst.panel.remove();
    trigger.removeAttribute("aria-haspopup");
    trigger.removeAttribute("aria-expanded");
    trigger.removeAttribute("aria-controls");
    bubbles.delete(trigger);
  };

  // ── Target-panel popover (popover.js) ──────────────────────────

  const showPanel = (trigger: HTMLElement): void => {
    const inst = panels.get(trigger);
    if (!inst) return;
    inst.panel.hidden = false;
    // Vanilla parity: position + ARIA + event settle on the next frame so
    // the un-hidden panel has layout before it is measured.
    requestAnimationFrame(() => {
      inst.panel.style.position = "absolute";
      place(trigger, inst.panel, inst.placement, PANEL_GAP);
      trigger.setAttribute("aria-expanded", "true");
      inst.panel.setAttribute("data-placement", inst.placement);
      trigger.dispatchEvent(
        new CustomEvent("popover:show", {
          bubbles: true,
          detail: { trigger, placement: inst.placement },
        }),
      );
    });
  };

  const hidePanel = (trigger: HTMLElement): void => {
    const inst = panels.get(trigger);
    if (!inst) return;
    inst.panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.dispatchEvent(
      new CustomEvent("popover:hide", { bubbles: true, detail: { trigger } }),
    );
  };

  const closeOtherPanels = (current: HTMLElement): void => {
    panels.forEach((inst, trigger) => {
      if (trigger === current) return;
      if (!inst.panel.hidden) hidePanel(trigger);
    });
  };

  const flipPlacement = (trigger: HTMLElement): void => {
    const inst = panels.get(trigger);
    if (!inst || !inst.allowFlip || inst.panel.hidden) return;
    const win = inst.panel.ownerDocument.defaultView ?? window;
    const rect = trigger.getBoundingClientRect();
    const popRect = inst.panel.getBoundingClientRect();
    const current = inst.placement;
    let flipped: string | null = null;

    if (current === "top" && rect.top - popRect.height - PANEL_GAP < 0) {
      flipped = "bottom";
    } else if (
      current === "bottom" &&
      rect.bottom + popRect.height + PANEL_GAP > win.innerHeight
    ) {
      flipped = "top";
    } else if (
      current === "left" &&
      rect.left - popRect.width - PANEL_GAP < 0
    ) {
      flipped = "right";
    } else if (
      current === "right" &&
      rect.right + popRect.width + PANEL_GAP > win.innerWidth
    ) {
      flipped = "left";
    }

    if (flipped) {
      inst.placement = flipped;
      inst.panel.style.position = "absolute";
      place(trigger, inst.panel, flipped, PANEL_GAP);
      inst.panel.setAttribute("data-placement", flipped);
    }
  };

  const findPanel = (trigger: HTMLElement): HTMLElement | null => {
    const selector = trigger.getAttribute("data-vd-popover-target");
    if (!selector) return null;
    const panel = trigger.ownerDocument.querySelector<HTMLElement>(selector);
    if (!panel) return null;
    panel.classList.add("vd-popover-panel");
    return panel;
  };

  const wirePanel = (trigger: HTMLElement): void => {
    const panel = findPanel(trigger);
    if (!panel) return;
    const cleanup: Array<() => void> = [];
    const placement = resolvePanelPlacement(
      trigger.getAttribute("data-vd-popover-placement"),
    );
    const modeList = resolveModes(
      trigger.getAttribute("data-vd-popover-trigger"),
    );
    const flipAttr = trigger.getAttribute("data-vd-popover-flip");
    const allowFlip = flipAttr === null ? defaultFlip : flipAttr !== "false";

    if (!panel.id) panel.id = uid("vd-popover-");
    if (!panel.hasAttribute("role")) panel.setAttribute("role", "dialog");
    if (!panel.hasAttribute("aria-modal")) {
      panel.setAttribute("aria-modal", "false");
    }

    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", panel.id);

    if (modeList.includes("click")) {
      const clickHandler = (e: Event): void => {
        e.stopPropagation();
        if (trigger.getAttribute("aria-expanded") === "true") {
          hidePanel(trigger);
        } else {
          closeOtherPanels(trigger);
          showPanel(trigger);
        }
      };
      trigger.addEventListener("click", clickHandler);
      cleanup.push(() => trigger.removeEventListener("click", clickHandler));
    }

    if (modeList.includes("hover")) {
      let leaveTimer: ReturnType<typeof setTimeout> | undefined;
      const enterHandler = (): void => {
        showPanel(trigger);
      };
      const leaveHandler = (): void => {
        leaveTimer = setTimeout(() => {
          if (!panel.matches(":hover") && !trigger.matches(":hover")) {
            hidePanel(trigger);
          }
        }, hoverLeaveDelay);
      };
      trigger.addEventListener("mouseenter", enterHandler);
      trigger.addEventListener("mouseleave", leaveHandler);
      panel.addEventListener("mouseenter", enterHandler);
      panel.addEventListener("mouseleave", leaveHandler);
      cleanup.push(() => {
        trigger.removeEventListener("mouseenter", enterHandler);
        trigger.removeEventListener("mouseleave", leaveHandler);
        panel.removeEventListener("mouseenter", enterHandler);
        panel.removeEventListener("mouseleave", leaveHandler);
        if (leaveTimer !== undefined) clearTimeout(leaveTimer);
      });
    }

    if (modeList.includes("focus")) {
      const focusHandler = (): void => {
        showPanel(trigger);
      };
      const blurHandler = (e: FocusEvent): void => {
        if (e.relatedTarget instanceof Node && panel.contains(e.relatedTarget))
          return;
        hidePanel(trigger);
      };
      trigger.addEventListener("focus", focusHandler);
      trigger.addEventListener("blur", blurHandler);
      cleanup.push(() => {
        trigger.removeEventListener("focus", focusHandler);
        trigger.removeEventListener("blur", blurHandler);
      });
    }

    const win = panel.ownerDocument.defaultView ?? window;
    const reflowHandler = (): void => {
      flipPlacement(trigger);
    };
    win.addEventListener("resize", reflowHandler);
    win.addEventListener("scroll", reflowHandler, true);
    cleanup.push(() => {
      win.removeEventListener("resize", reflowHandler);
      win.removeEventListener("scroll", reflowHandler, true);
    });

    panels.set(trigger, {
      panel,
      placement,
      modes: modeList.join(" "),
      allowFlip,
      cleanup,
    });
  };

  const destroyPanel = (trigger: HTMLElement): void => {
    const inst = panels.get(trigger);
    if (!inst) return;
    inst.cleanup.forEach((fn) => fn());
    if (!inst.panel.hidden) hidePanel(trigger);
    trigger.removeAttribute("aria-haspopup");
    trigger.removeAttribute("aria-expanded");
    trigger.removeAttribute("aria-controls");
    panels.delete(trigger);
  };

  // ── Shared dismissal (capture-phase outside click + Escape) ────

  const onDocClick = (e: Event): void => {
    const target = e.target as Node | null;
    if (!target) return;
    bubbles.forEach((inst, trigger) => {
      if (!inst.panel.classList.contains("is-visible")) return;
      if (inst.panel.contains(target) || trigger.contains(target)) return;
      hideBubble(trigger);
    });
    panels.forEach((inst, trigger) => {
      // Vanilla parity: only pure click-mode panels dismiss on outside click.
      if (inst.modes !== "click") return;
      if (inst.panel.hidden) return;
      if (inst.panel.contains(target) || trigger.contains(target)) return;
      hidePanel(trigger);
    });
  };

  const onDocKeydown = (e: KeyboardEvent): void => {
    if (e.key !== "Escape") return;
    bubbles.forEach((inst, trigger) => {
      if (inst.panel.classList.contains("is-visible")) hideBubble(trigger);
    });
    // Vanilla parity: Escape closes the last open panel (not all of them).
    let lastOpen: HTMLElement | null = null;
    panels.forEach((inst, trigger) => {
      if (!inst.panel.hidden) lastOpen = trigger;
    });
    if (lastOpen) hidePanel(lastOpen);
  };

  const ensureGlobalListeners = (doc: Document): void => {
    if (globalCleanups.length > 0) return;
    doc.addEventListener("click", onDocClick, true);
    doc.addEventListener("keydown", onDocKeydown);
    globalCleanups.push(
      () => doc.removeEventListener("click", onDocClick, true),
      () => doc.removeEventListener("keydown", onDocKeydown),
    );
  };

  // ── Wiring ─────────────────────────────────────────────────────

  const wire = (scope: HTMLElement): void => {
    // Panel primitive first: a data-vd-popover-target trigger always gets
    // the panel behavior, even when a bubble content attribute coexists.
    scope
      .querySelectorAll<HTMLElement>(
        ".vd-popover-trigger, [data-vd-popover-target]",
      )
      .forEach((trigger) => {
        if (panels.has(trigger) || bubbles.has(trigger)) return;
        wirePanel(trigger);
      });

    // Attribute-built bubble. The root itself may be a trigger — vanilla
    // Vanduo.queryAll included a matching root.
    const bubbleSelector = "[data-vd-bubble], [data-vd-popover]";
    const bubbleTriggers: HTMLElement[] = scope.matches(bubbleSelector)
      ? [scope]
      : [];
    scope
      .querySelectorAll<HTMLElement>(bubbleSelector)
      .forEach((el) => bubbleTriggers.push(el));
    bubbleTriggers.forEach((trigger) => {
      if (trigger.hasAttribute("data-vd-popover-target")) return;
      if (bubbles.has(trigger) || panels.has(trigger)) return;
      buildBubble(trigger);
    });
  };

  const refresh = (): void => {
    if (typeof document === "undefined") return;
    const scope = root.value;
    if (!scope) return;
    wire(scope);
    ensureGlobalListeners(scope.ownerDocument);
  };

  const show = (trigger: HTMLElement): void => {
    if (bubbles.has(trigger)) showBubble(trigger);
    else if (panels.has(trigger)) showPanel(trigger);
  };

  const hide = (trigger: HTMLElement): void => {
    if (bubbles.has(trigger)) hideBubble(trigger);
    else if (panels.has(trigger)) hidePanel(trigger);
  };

  const hideAll = (): void => {
    hideAllBubbles();
    panels.forEach((inst, trigger) => {
      if (!inst.panel.hidden) hidePanel(trigger);
    });
  };

  onMounted(refresh);

  onScopeDispose(() => {
    bubbles.forEach((_inst, trigger) => destroyBubble(trigger));
    panels.forEach((_inst, trigger) => destroyPanel(trigger));
    globalCleanups.forEach((fn) => fn());
    globalCleanups.length = 0;
  });

  return { show, hide, hideAll, refresh };
}
