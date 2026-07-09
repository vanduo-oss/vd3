import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Ports framework/js/components/waypoint.js — scans `root` for
 * `[data-vd-waypoint-nav]` / `[data-vd-scrollspy-nav]` navs and highlights the
 * link of the topmost visible section as the user scrolls (IntersectionObserver,
 * topmost-wins, smooth-scroll on click, `waypoint:change` event).
 *
 * Two fixes-to-documented-intent vs the Vanilla JS:
 *  - The Vanilla observer always ran against the viewport and ignored the
 *    attribute value, so a nav pointed at an overflow container (the docs'
 *    sidebar demo) never updated. Here the attribute value is resolved to an
 *    element and used as the IntersectionObserver `root` — the documented
 *    behaviour ("selector for the scrollable container to observe") — so
 *    overflow-container scrollspy actually works.
 *  - The active link also receives `aria-current="true"`, which the docs
 *    accessibility notes promise but the Vanilla JS never set.
 */
export function useWaypoint(root: Ref<HTMLElement | null>): void {
  const cleanups: Array<() => void> = [];

  onMounted(() => {
    if (typeof window === "undefined") return;
    const host = root.value;
    if (!host) return;

    const navs = host.querySelectorAll<HTMLElement>(
      "[data-vd-waypoint-nav], [data-vd-scrollspy-nav]",
    );

    navs.forEach((nav) => {
      const links = Array.from(
        nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'),
      );
      if (links.length === 0) return;

      const offset = parseInt(
        nav.getAttribute("data-vd-waypoint-offset") || "80",
        10,
      );

      const selector =
        nav.getAttribute("data-vd-waypoint-nav") ||
        nav.getAttribute("data-vd-scrollspy-nav") ||
        "";
      let scrollRoot: Element | null = null;
      if (selector && selector !== "window") {
        scrollRoot = document.querySelector(selector);
      }

      const sections: {
        id: string;
        link: HTMLAnchorElement;
        section: HTMLElement;
      }[] = [];
      links.forEach((link) => {
        const id = (link.getAttribute("href") || "").slice(1);
        const section = id ? document.getElementById(id) : null;
        if (section) {
          section.setAttribute("data-vd-waypoint-section", "");
          sections.push({ id, link, section });
        }
      });
      if (sections.length === 0) return;

      const visible = new Set<string>();

      const setActive = (id: string): void => {
        links.forEach((l) => {
          l.classList.remove("is-active");
          l.removeAttribute("aria-current");
        });
        const target = links.find((l) => l.getAttribute("href") === "#" + id);
        if (target) {
          target.classList.add("is-active");
          target.setAttribute("aria-current", "true");
          nav.dispatchEvent(
            new CustomEvent("waypoint:change", {
              detail: { activeId: id, link: target },
            }),
          );
        }
      };

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) visible.add(entry.target.id);
            else visible.delete(entry.target.id);
          });
          for (const s of sections) {
            if (visible.has(s.id)) {
              setActive(s.id);
              return;
            }
          }
        },
        {
          root: scrollRoot,
          rootMargin: "-" + offset + "px 0px -40% 0px",
          threshold: 0,
        },
      );

      sections.forEach((s) => observer.observe(s.section));

      links.forEach((link) => {
        const onClick = (e: Event): void => {
          e.preventDefault();
          const id = (link.getAttribute("href") || "").slice(1);
          const section = id ? document.getElementById(id) : null;
          if (section) {
            section.scrollIntoView({ behavior: "smooth" });
            setActive(id);
          }
        };
        link.addEventListener("click", onClick);
        cleanups.push(() => link.removeEventListener("click", onClick));
      });

      cleanups.push(() => observer.disconnect());
    });
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });
}
