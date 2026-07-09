import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Reproduces the open/close behavior of
 * `framework/js/components/sidenav.js` for `.vd-sidenav` and `.vd-offcanvas`
 * drawers: `[data-sidenav-toggle="#id"]` triggers, a body-level overlay,
 * close button, overlay-click (unless `data-backdrop="static"`), Escape
 * (unless `data-keyboard="false"`), body scroll-lock, `data-vd-position`
 * direction class, and `sidenav:open` / `sidenav:close` events.
 *
 * The Vanilla portal-to-body + push/fixed/resize handling is omitted: the demo
 * drawers are `position: fixed`, so they overlay the viewport without moving in
 * the DOM, which keeps this from fighting Vue's ownership of the elements.
 */
export function useSidenav(root: Ref<HTMLElement | null>): void {
  const cleanups: Array<() => void> = [];
  const overlays: HTMLElement[] = [];

  const open = (el: HTMLElement, overlay: HTMLElement): void => {
    if (
      !el.classList.contains("vd-sidenav-fixed") &&
      !el.classList.contains("vd-offcanvas-fixed")
    ) {
      overlay.classList.add("is-visible");
    }
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("body-sidenav-open");
    el.dispatchEvent(new CustomEvent("sidenav:open", { bubbles: true }));
  };

  const close = (el: HTMLElement, overlay: HTMLElement): void => {
    overlay.classList.remove("is-visible");
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    document.body.classList.remove("body-sidenav-open");
    el.dispatchEvent(new CustomEvent("sidenav:close", { bubbles: true }));
  };

  const toggle = (el: HTMLElement, overlay: HTMLElement): void => {
    if (el.classList.contains("is-open")) close(el, overlay);
    else open(el, overlay);
  };

  onMounted(() => {
    const scope = root.value;
    if (!scope) return;

    const overlayFor = new Map<HTMLElement, HTMLElement>();

    scope
      .querySelectorAll<HTMLElement>(".vd-sidenav, .vd-offcanvas")
      .forEach((el) => {
        const position = el.getAttribute("data-vd-position");
        if (position) {
          const prefix = el.classList.contains("vd-offcanvas")
            ? "vd-offcanvas"
            : "vd-sidenav";
          el.classList.add(`${prefix}-${position}`);
        }

        const overlay = document.createElement("div");
        overlay.className = "vd-sidenav-overlay";
        document.body.appendChild(overlay);
        overlays.push(overlay);
        overlayFor.set(el, overlay);

        el.setAttribute("role", "navigation");
        el.setAttribute("aria-hidden", "true");

        const closeBtn = el.querySelector<HTMLElement>(
          ".vd-sidenav-close, .vd-offcanvas-close",
        );
        if (closeBtn) {
          const h = (): void => close(el, overlay);
          closeBtn.addEventListener("click", h);
          cleanups.push(() => closeBtn.removeEventListener("click", h));
        }

        const onOverlay = (): void => {
          if (el.dataset.backdrop !== "static") close(el, overlay);
        };
        overlay.addEventListener("click", onOverlay);
        cleanups.push(() => overlay.removeEventListener("click", onOverlay));

        const onEsc = (e: KeyboardEvent): void => {
          if (
            e.key === "Escape" &&
            el.classList.contains("is-open") &&
            el.dataset.keyboard !== "false"
          ) {
            close(el, overlay);
          }
        };
        document.addEventListener("keydown", onEsc);
        cleanups.push(() => document.removeEventListener("keydown", onEsc));
      });

    scope
      .querySelectorAll<HTMLElement>("[data-sidenav-toggle]")
      .forEach((btn) => {
        const onClick = (e: Event): void => {
          e.preventDefault();
          const targetId = btn.dataset.sidenavToggle;
          if (!targetId) return;
          const el = document.querySelector<HTMLElement>(targetId);
          const overlay = el ? overlayFor.get(el) : undefined;
          if (el && overlay) toggle(el, overlay);
        };
        btn.addEventListener("click", onClick);
        cleanups.push(() => btn.removeEventListener("click", onClick));
      });
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    overlays.forEach((o) => o.remove());
    overlays.length = 0;
    document.body.classList.remove("body-sidenav-open");
  });
}
