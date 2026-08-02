import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Ports the docs-only multi-state morph badge cycling from
 * `docs/js/modules/demos.js` (`initSectionDemos`). Wires
 * `[data-vd-morph="manual"][data-morph-states]` badges to cycle through
 * `data-morph-states` / `-classes` / `-icons` on click, swapping the badge
 * variant class and the current/next content with the morph wave.
 */
export function useMorphBadges(root: Ref<HTMLElement | null>): void {
  const cleanups: Array<() => void> = [];

  const setContent = (
    target: Element | null,
    icon: string,
    label: string,
  ): void => {
    if (!target) return;
    const safeIcon = String(icon || "")
      .replace(/[^a-z0-9-\s]/gi, "")
      .trim();
    while (target.firstChild) target.removeChild(target.firstChild);
    if (safeIcon) {
      const i = document.createElement("i");
      i.className = `ph ${safeIcon}`;
      i.style.marginRight = "0.35rem";
      target.appendChild(i);
    }
    target.appendChild(
      document.createTextNode(label == null ? "" : String(label)),
    );
  };

  onMounted(() => {
    const scope = root.value;
    if (!scope) return;

    scope
      .querySelectorAll<HTMLElement>(
        '[data-vd-morph="manual"][data-morph-states]',
      )
      .forEach((badge) => {
        const states: string[] = JSON.parse(
          badge.getAttribute("data-morph-states") || "[]",
        );
        const classes: string[] = JSON.parse(
          badge.getAttribute("data-morph-classes") || "[]",
        );
        const icons: string[] = JSON.parse(
          badge.getAttribute("data-morph-icons") || "[]",
        );
        let idx = 0;
        let morphing = false;

        let morphMs = 600;
        const d = getComputedStyle(badge)
          .getPropertyValue("--vd-morph-duration")
          .trim();
        if (d) {
          const parsed = parseFloat(d);
          if (!isNaN(parsed)) morphMs = parsed * (d.includes("ms") ? 1 : 1000);
        }

        const settleMorph = (nextIdx: number, afterIdx: number): void => {
          badge.classList.add("is-morph-settling");
          classes.forEach((c) => badge.classList.remove(c));
          if (classes[nextIdx]) badge.classList.add(classes[nextIdx]);
          const current = badge.querySelector(".vd-morph-current");
          const nextEl = badge.querySelector(".vd-morph-next");
          if (current && nextEl) {
            current.classList.replace("vd-morph-current", "vd-morph-next");
            nextEl.classList.replace("vd-morph-next", "vd-morph-current");
            // Former current is now the hidden next — prime the following state.
            setContent(current, icons[afterIdx] ?? "", states[afterIdx] ?? "");
          }
          badge.classList.remove("is-morphing");
          void badge.offsetWidth;
          badge.classList.remove("is-morph-settling");
          idx = nextIdx;
        };

        const onClick = (e: MouseEvent): void => {
          if (
            morphing ||
            states.length === 0 ||
            badge.classList.contains("is-morphing") ||
            badge.classList.contains("is-morph-settling")
          ) {
            return;
          }
          morphing = true;
          const nextIdx = (idx + 1) % states.length;
          const afterIdx = (nextIdx + 1) % states.length;

          const next = badge.querySelector(".vd-morph-next");
          if (next)
            setContent(next, icons[nextIdx] ?? "", states[nextIdx] ?? "");

          const wave = badge.querySelector<HTMLElement>(".vd-morph-wave");
          if (wave) {
            const rect = badge.getBoundingClientRect();
            wave.style.left = `${(e.clientX || rect.left + rect.width / 2) - rect.left}px`;
            wave.style.top = `${(e.clientY || rect.top + rect.height / 2) - rect.top}px`;
          }

          badge.classList.remove("is-morphing", "is-morph-settling");
          void badge.offsetWidth;
          badge.classList.add("is-morphing");
          window.setTimeout(() => {
            settleMorph(nextIdx, afterIdx);
            window.setTimeout(() => {
              morphing = false;
            }, 80);
          }, morphMs);
        };

        badge.addEventListener("click", onClick);
        cleanups.push(() => badge.removeEventListener("click", onClick));
      });
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });
}
