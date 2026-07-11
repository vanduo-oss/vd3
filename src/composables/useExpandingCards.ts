import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Ports `framework/js/components/expanding-cards.js` — scans `root` for
 * `.vd-expanding-cards` containers (including the root itself when it matches,
 * mirroring the vanilla `Vanduo.queryAll`; containers marked
 * `data-vd-expanding-cards="manual"` are skipped) and wires the
 * click-to-expand strip: clicking a `.vd-expanding-card` makes it the single
 * `is-active` card and focuses it. Every card gets `tabindex="0"` (unless
 * authored), `role="button"`, and `aria-pressed` mirroring `is-active`, kept
 * in sync via a MutationObserver. ArrowLeft/ArrowRight (plus ArrowUp/ArrowDown
 * only when the container is column-direction), Home, and End move activation
 * among visible cards.
 *
 * vd3 extension: Enter/Space on a focused card activates it. The vanilla
 * header documented this but relied on `role="button"` synthesizing clicks,
 * which plain elements never do — the rewrite wires it explicitly.
 *
 * Teardown removes this instance's listeners and disconnects its observers
 * only (the vanilla global `destroyAll()` is per-instance by design).
 */
export function useExpandingCards(root: Ref<HTMLElement | null>): void {
  const cleanups: Array<() => void> = [];

  const initContainer = (container: HTMLElement): void => {
    const getCards = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(".vd-expanding-card"));

    const setActive = (card: HTMLElement | undefined): void => {
      const cards = getCards();
      if (!card || !cards.includes(card)) return;
      cards.forEach((c) => {
        c.classList.toggle("is-active", c === card);
      });
      card.focus({ preventScroll: true });
    };

    const onClick = (e: MouseEvent): void => {
      const t = e.target;
      const card =
        t instanceof Element
          ? t.closest<HTMLElement>(".vd-expanding-card")
          : null;
      if (!card || !container.contains(card)) return;
      setActive(card);
    };

    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key === "Enter" || e.key === " ") {
        // vd3 extension (see JSDoc): explicit role="button" activation of the
        // focused card itself — inner interactive children are left alone.
        const t = e.target;
        if (
          !(t instanceof HTMLElement) ||
          !t.matches(".vd-expanding-card") ||
          !container.contains(t)
        ) {
          return;
        }
        e.preventDefault();
        setActive(t);
        return;
      }
      if (
        e.key !== "ArrowLeft" &&
        e.key !== "ArrowRight" &&
        e.key !== "ArrowUp" &&
        e.key !== "ArrowDown" &&
        e.key !== "Home" &&
        e.key !== "End"
      ) {
        return;
      }
      const cards = getCards().filter(
        (c) => c.offsetParent !== null || c.getClientRects().length > 0,
      );
      if (!cards.length) return;
      const activeEl = document.activeElement;
      let idx = activeEl instanceof HTMLElement ? cards.indexOf(activeEl) : -1;
      if (idx < 0) {
        idx = cards.findIndex((c) => c.classList.contains("is-active"));
      }
      if (idx < 0) idx = 0;

      const isVertical =
        window.getComputedStyle(container).flexDirection === "column";
      if (!isVertical && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive(cards[Math.max(0, idx - 1)]);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActive(cards[Math.min(cards.length - 1, idx + 1)]);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActive(cards[0]);
      } else if (e.key === "End") {
        e.preventDefault();
        setActive(cards[cards.length - 1]);
      }
    };

    container.addEventListener("click", onClick);
    container.addEventListener("keydown", onKeydown);
    cleanups.push(() => {
      container.removeEventListener("click", onClick);
      container.removeEventListener("keydown", onKeydown);
    });

    getCards().forEach((card) => {
      if (!card.hasAttribute("tabindex")) {
        card.setAttribute("tabindex", "0");
      }
      card.setAttribute("role", "button");
      if (!card.hasAttribute("aria-pressed")) {
        card.setAttribute(
          "aria-pressed",
          card.classList.contains("is-active") ? "true" : "false",
        );
      }
    });

    const syncAria = (): void => {
      getCards().forEach((card) => {
        card.setAttribute(
          "aria-pressed",
          card.classList.contains("is-active") ? "true" : "false",
        );
      });
    };

    const observer = new MutationObserver(syncAria);
    observer.observe(container, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class"],
    });
    cleanups.push(() => observer.disconnect());
    syncAria();
  };

  onMounted(() => {
    if (typeof window === "undefined") return;
    const host = root.value;
    if (!host) return;

    const containers: HTMLElement[] = [];
    if (host.matches(".vd-expanding-cards")) containers.push(host);
    host
      .querySelectorAll<HTMLElement>(".vd-expanding-cards")
      .forEach((el) => containers.push(el));

    containers.forEach((el) => {
      if (el.getAttribute("data-vd-expanding-cards") === "manual") return;
      initContainer(el);
    });
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });
}
