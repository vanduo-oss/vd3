import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Controller returned by `useTabs` (vd3 extension — the old shim returned
 * `void`, so call sites that discard the result port unchanged).
 */
export interface UseTabsController {
  /**
   * vd3 extension — programmatically activate a tab. Pass the `.vd-tab-link`
   * element, or an index into `container`'s tab links (`container` defaults
   * to the first `.vd-tabs` inside the root). Replaces the vanilla
   * `VanduoTabs.show('tab-id')` document-wide selector convenience.
   */
  show(tab: HTMLElement | number, container?: HTMLElement): void;
  /**
   * vd3 extension — re-scan the root and (re)apply wiring idempotently.
   * Click/keydown listeners are delegated on each `.vd-tabs` container, so
   * `v-for` re-renders of the links keep working without a call; call this
   * after adding whole new `.vd-tabs` containers or new links that need
   * their ARIA attributes (re)applied.
   */
  refresh(): void;
}

/**
 * Ports framework/js/components/tabs.js — wires every `.vd-tabs` container
 * inside `root` with the full vanilla tab behavior: tablist/tab/tabpanel
 * ARIA (`role="tablist"` on `.vd-tab-list`, `role="tab"` + `aria-selected`
 * + roving tabindex on `.vd-tab-link`s, `role="tabpanel"` +
 * `aria-labelledby` on panes, generated ids and `aria-controls`
 * back-links), click and Enter/Space activation skipping `disabled` tabs,
 * orientation-aware arrow keys (ArrowLeft/ArrowRight horizontal,
 * ArrowUp/ArrowDown on `.vd-tabs-vertical`) plus Home/End — moving focus
 * AND activation with wrap-around while skipping disabled tabs — three-way
 * pane resolution (`[data-tab-pane]` attribute, then id, then index),
 * `.is-active` state classes on the tab, its `.vd-tab-item` parent, and the
 * pane, auto-activation of the first tab when none is active at mount, and
 * a bubbling `tab:change` CustomEvent with `{ tab, pane, tabId }`.
 *
 * Dropped vanilla-layer concepts: document-wide auto-init, the instances
 * registry, and `Vanduo.register`. Teardown removes exactly this instance's
 * listeners.
 */
export function useTabs(root: Ref<HTMLElement | null>): UseTabsController {
  // container -> remove-listeners cleanup (delegated, one pair per container)
  const wired = new Map<HTMLElement, () => void>();

  const ownedBy = (container: HTMLElement, el: Element): boolean =>
    el.closest(".vd-tabs") === container;

  const linksOf = (container: HTMLElement): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>(".vd-tab-link")).filter(
      (link) => ownedBy(container, link),
    );

  const panesOf = (container: HTMLElement): HTMLElement[] =>
    Array.from(
      container.querySelectorAll<HTMLElement>(".vd-tab-pane, [data-tab-pane]"),
    ).filter((pane) => ownedBy(container, pane));

  const isDisabled = (link: HTMLElement): boolean =>
    link.classList.contains("disabled") ||
    (link as HTMLButtonElement).disabled === true;

  const getTabId = (link: HTMLElement, fallbackIndex: number): string =>
    link.dataset.tabTarget ||
    link.dataset.tab ||
    link.getAttribute("href")?.replace("#", "") ||
    `tab-${fallbackIndex}`;

  // Escapes a value for use inside a quoted CSS attribute selector
  // (CSS.escape is missing from some DOM environments, e.g. jsdom).
  const escapeAttr = (value: string): string =>
    value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  // Three-way pane resolution: data attribute, then id, then index.
  const findPane = (
    container: HTMLElement,
    tabId: string,
    panes: HTMLElement[],
  ): HTMLElement | null => {
    let pane =
      panes.find((p) => p.getAttribute("data-tab-pane") === tabId) ?? null;
    if (!pane) {
      pane = container.querySelector<HTMLElement>(
        `[id="${escapeAttr(tabId)}"]`,
      );
    }
    if (!pane) {
      linksOf(container).forEach((link, index) => {
        if (getTabId(link, index) === tabId && panes[index]) {
          pane = panes[index];
        }
      });
    }
    return pane;
  };

  const activateTab = (container: HTMLElement, tab: HTMLElement): void => {
    const allTabs = linksOf(container);
    const allPanes = panesOf(container);
    const tabId = getTabId(tab, allTabs.indexOf(tab));

    allTabs.forEach((t) => {
      t.classList.remove("is-active");
      t.setAttribute("aria-selected", "false");
      t.setAttribute("tabindex", "-1");
      if (t.parentElement?.classList.contains("vd-tab-item")) {
        t.parentElement.classList.remove("is-active");
      }
    });
    allPanes.forEach((p) => p.classList.remove("is-active"));

    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    tab.setAttribute("tabindex", "0");
    if (tab.parentElement?.classList.contains("vd-tab-item")) {
      tab.parentElement.classList.add("is-active");
    }

    const pane = findPane(container, tabId, allPanes);
    pane?.classList.add("is-active");

    container.dispatchEvent(
      new CustomEvent("tab:change", {
        bubbles: true,
        detail: { tab, pane, tabId },
      }),
    );
  };

  const handleKeydown = (
    e: KeyboardEvent,
    container: HTMLElement,
    currentTab: HTMLElement,
  ): void => {
    const isVertical = container.classList.contains("vd-tabs-vertical");
    const tabs = linksOf(container).filter((t) => !isDisabled(t));
    const currentIndex = tabs.indexOf(currentTab);
    let newIndex = currentIndex;

    switch (e.key) {
      case "ArrowLeft":
        if (!isVertical) {
          e.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        }
        break;

      case "ArrowRight":
        if (!isVertical) {
          e.preventDefault();
          newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        }
        break;

      case "ArrowUp":
        if (isVertical) {
          e.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        }
        break;

      case "ArrowDown":
        if (isVertical) {
          e.preventDefault();
          newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        }
        break;

      case "Home":
        e.preventDefault();
        newIndex = 0;
        break;

      case "End":
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;

      case "Enter":
      case " ":
        e.preventDefault();
        activateTab(container, currentTab);
        return;

      default:
        return;
    }

    const next = tabs[newIndex];
    if (newIndex !== currentIndex && next) {
      next.focus();
      activateTab(container, next);
    }
  };

  const closestLink = (e: Event): HTMLElement | null =>
    e.target instanceof Element
      ? e.target.closest<HTMLElement>(".vd-tab-link")
      : null;

  // Delegated listeners on the container (vanilla wired each link) so v-for
  // re-renders of the links don't strand handlers — design decision 5.
  const attach = (container: HTMLElement): void => {
    if (wired.has(container)) return;

    const onClick = (e: Event): void => {
      const link = closestLink(e);
      if (!link || !ownedBy(container, link)) return;
      e.preventDefault();
      if (!isDisabled(link)) activateTab(container, link);
    };

    const onKeydown = (e: KeyboardEvent): void => {
      const link = closestLink(e);
      if (!link || !ownedBy(container, link)) return;
      handleKeydown(e, container, link);
    };

    container.addEventListener("click", onClick);
    container.addEventListener("keydown", onKeydown);
    wired.set(container, () => {
      container.removeEventListener("click", onClick);
      container.removeEventListener("keydown", onKeydown);
    });
  };

  // Idempotent ARIA/roving-tabindex wiring for one container.
  const wire = (container: HTMLElement): void => {
    const tabList = container.querySelector<HTMLElement>(
      '.vd-tab-list, [role="tablist"]',
    );
    const tabLinks = linksOf(container);
    const tabPanes = panesOf(container);
    if (!tabList || tabLinks.length === 0) return;

    tabList.setAttribute("role", "tablist");

    tabLinks.forEach((link, index) => {
      const tabId = getTabId(link, index);
      const pane = findPane(container, tabId, tabPanes);
      const isActive = link.classList.contains("is-active");

      link.setAttribute("role", "tab");
      link.setAttribute("aria-selected", isActive ? "true" : "false");
      link.setAttribute("tabindex", isActive ? "0" : "-1");
      if (!link.id) link.id = `tab-btn-${tabId}`;

      if (pane) {
        pane.setAttribute("role", "tabpanel");
        pane.setAttribute("aria-labelledby", link.id);
        if (!pane.id) pane.id = `tab-pane-${tabId}`;
        link.setAttribute("aria-controls", pane.id);
      }
    });

    // Ensure one tab is active.
    const active = tabLinks.some((l) => l.classList.contains("is-active"));
    const first = tabLinks[0];
    if (!active && first) activateTab(container, first);
  };

  const refresh = (): void => {
    const el = root.value;
    if (!el) return;
    el.querySelectorAll<HTMLElement>(".vd-tabs").forEach((container) => {
      attach(container);
      wire(container);
    });
  };

  const show = (tab: HTMLElement | number, container?: HTMLElement): void => {
    if (typeof tab === "number") {
      const target =
        container ?? root.value?.querySelector<HTMLElement>(".vd-tabs");
      const link = target ? linksOf(target)[tab] : undefined;
      if (target && link) activateTab(target, link);
      return;
    }
    const owner = container ?? tab.closest<HTMLElement>(".vd-tabs");
    if (owner) activateTab(owner, tab);
  };

  onMounted(refresh);

  onUnmounted(() => {
    wired.forEach((cleanup) => cleanup());
    wired.clear();
  });

  return { show, refresh };
}
