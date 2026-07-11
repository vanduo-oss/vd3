import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Controller returned by `useDropdown` (vd3 extension — the old shim returned
 * `void`, so call sites that discard the result port unchanged; `VdMenu`
 * discards it). Replaces the vanilla `VanduoDropdown.open` / `.close`
 * document-wide selector convenience.
 */
export interface UseDropdownController {
  /**
   * vd3 extension — programmatically open a dropdown. Pass the `.vd-dropdown`
   * element (or a descendant), a CSS selector resolved inside the root then the
   * document, or omit `target` to open the sole dropdown wired in the root.
   */
  open(target?: HTMLElement | string): void;
  /**
   * vd3 extension — programmatically close a dropdown (see `open` for `target`
   * resolution); restores focus to that dropdown's toggle.
   */
  close(target?: HTMLElement | string): void;
}

interface DropdownRuntime {
  dropdown: HTMLElement;
  toggle: HTMLElement;
  menu: HTMLElement;
  typeaheadBuffer: string;
  typeaheadTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Ports framework/js/components/dropdown.js (369 lines) — wires every
 * `.vd-dropdown` container inside `root` with the full vanilla dropdown
 * behavior: toggle ARIA (`aria-haspopup`, `aria-expanded`) and menu ARIA
 * (`role="menu"`, `aria-hidden`); click toggling that adds/removes `is-open`
 * on both the container and the menu; opening closes the OTHER dropdowns this
 * instance wired and focuses the first non-disabled item; closing restores
 * focus to the toggle; outside-click closes; auto-placement that resets and
 * re-adds `vd-dropdown-menu-end` / `-start` / `-top` from viewport overflow
 * while honoring explicit `vd-dropdown-dropup` / `-dropright` / `-dropleft`
 * wrappers; the full keyboard set (Enter/Space/ArrowDown open, ArrowDown/
 * ArrowUp cycle item focus while open, Home/End jump, Escape closes with
 * refocus, printable keys drive a 500 ms typeahead buffer focusing the first
 * item whose text starts with the buffer, Enter/Space on a focused item
 * selects it); item selection (click or Enter/Space) marking the item
 * `active`/`is-active`, updating a button toggle's label to the item text,
 * closing, and dispatching a bubbling `dropdown:select` CustomEvent with
 * `{ item, value }` (`data-value` falling back to text). Disabled items
 * (`.disabled` / `.is-disabled`) are excluded from focus and selection.
 *
 * Deliberate adaptations from the vanilla source:
 *   - Click and keydown are DELEGATED on each `.vd-dropdown` container rather
 *     than bound per-toggle / per-item, so `v-for` re-renders of the items do
 *     not strand listeners (design decision 5). This also fixes a latent gap
 *     in the source, which bound the keydown handler only to the toggle and so
 *     never received Arrow/Home/End/Escape/typeahead while an item was focused.
 *     Ownership is scoped with `closest('.vd-dropdown')` so nested dropdowns
 *     are handled by their own runtime, not an ancestor's.
 *   - "Close others" is scoped to the dropdowns THIS instance wired (sibling
 *     `useDropdown` instances stay isolated) and does not refocus their
 *     toggles; outside-click closes without refocus either — refocus is
 *     reserved for the intentional Escape / selection / `controller.close`
 *     paths the spec calls out.
 *   - `aria-haspopup` is only defaulted to `"true"` when the toggle does not
 *     already declare it, so component-authored values (e.g. `VdMenu`'s
 *     `aria-haspopup="menu"`) are preserved.
 *
 * Dropped vanilla-layer concepts: document-wide auto-init, the instances
 * registry, `Vanduo.register`, and the `window.VanduoDropdown` global.
 */
export function useDropdown(
  root: Ref<HTMLElement | null>,
): UseDropdownController {
  const runtimes: DropdownRuntime[] = [];
  const cleanups: Array<() => void> = [];

  const ownedBy = (rt: DropdownRuntime, el: Element): boolean =>
    el.closest(".vd-dropdown") === rt.dropdown;

  const isDisabledItem = (item: Element): boolean =>
    item.classList.contains("disabled") ||
    item.classList.contains("is-disabled");

  const enabledItems = (rt: DropdownRuntime): HTMLElement[] =>
    Array.from(
      rt.menu.querySelectorAll<HTMLElement>(".vd-dropdown-item"),
    ).filter((item) => !isDisabledItem(item) && ownedBy(rt, item));

  const positionMenu = (dropdown: HTMLElement, menu: HTMLElement): void => {
    const rect = dropdown.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;

    // Reset auto-position classes before computing a new state.
    menu.classList.remove(
      "vd-dropdown-menu-end",
      "vd-dropdown-menu-start",
      "vd-dropdown-menu-top",
    );

    // Directional wrappers explicitly control placement in CSS.
    if (dropdown.classList.contains("vd-dropdown-dropup")) {
      menu.classList.add("vd-dropdown-menu-top");
      return;
    }
    if (
      dropdown.classList.contains("vd-dropdown-dropright") ||
      dropdown.classList.contains("vd-dropdown-dropleft")
    ) {
      return;
    }

    // Flip to end alignment when the menu would overflow the right edge.
    if (rect.left + menuRect.width > viewportWidth - padding) {
      menu.classList.add("vd-dropdown-menu-end");
    } else {
      menu.classList.add("vd-dropdown-menu-start");
    }

    // Flip above the trigger when there is not enough room below.
    if (
      rect.bottom + menuRect.height > viewportHeight - padding &&
      rect.top - menuRect.height > padding
    ) {
      menu.classList.add("vd-dropdown-menu-top");
    }
  };

  const closeDropdown = (rt: DropdownRuntime, refocus = true): void => {
    rt.dropdown.classList.remove("is-open");
    rt.menu.classList.remove("is-open");
    rt.toggle.setAttribute("aria-expanded", "false");
    rt.menu.setAttribute("aria-hidden", "true");
    if (refocus) rt.toggle.focus();
  };

  const openDropdown = (rt: DropdownRuntime): void => {
    // Close the other dropdowns this instance wired (sibling instances stay
    // isolated); do not steal focus back to their toggles.
    runtimes.forEach((other) => {
      if (other !== rt && other.menu.classList.contains("is-open")) {
        closeDropdown(other, false);
      }
    });

    rt.dropdown.classList.add("is-open");
    rt.menu.classList.add("is-open");
    rt.toggle.setAttribute("aria-expanded", "true");
    rt.menu.setAttribute("aria-hidden", "false");

    positionMenu(rt.dropdown, rt.menu);

    const first = enabledItems(rt)[0];
    if (first) setTimeout(() => first.focus(), 0);
  };

  const toggleDropdown = (rt: DropdownRuntime): void => {
    if (rt.menu.classList.contains("is-open")) closeDropdown(rt);
    else openDropdown(rt);
  };

  const selectItem = (rt: DropdownRuntime, item: HTMLElement): void => {
    rt.menu.querySelectorAll(".vd-dropdown-item").forEach((i) => {
      i.classList.remove("active", "is-active");
    });
    item.classList.add("active", "is-active");

    if (rt.toggle.tagName === "BUTTON" || rt.toggle.classList.contains("btn")) {
      rt.toggle.textContent = (item.textContent ?? "").trim();
    }

    closeDropdown(rt);

    item.dispatchEvent(
      new CustomEvent("dropdown:select", {
        bubbles: true,
        detail: { item, value: item.dataset.value || item.textContent },
      }),
    );
  };

  const handleKeydown = (e: KeyboardEvent, rt: DropdownRuntime): void => {
    const target = e.target instanceof Element ? e.target : null;

    // Enter/Space on a focused item selects it (the source wired this per item).
    const itemHit = target?.closest<HTMLElement>(".vd-dropdown-item");
    if (
      itemHit &&
      ownedBy(rt, itemHit) &&
      !isDisabledItem(itemHit) &&
      (e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      selectItem(rt, itemHit);
      return;
    }

    const isOpen = rt.menu.classList.contains("is-open");
    const items = enabledItems(rt);
    const currentIndex = items.findIndex(
      (item) => item === document.activeElement,
    );

    switch (e.key) {
      case "Enter":
      case " ":
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          openDropdown(rt);
        } else if (e.key === "ArrowDown") {
          const nextIndex =
            currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          items[nextIndex]?.focus();
        }
        break;

      case "ArrowUp":
        if (isOpen) {
          e.preventDefault();
          const prevIndex =
            currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          items[prevIndex]?.focus();
        }
        break;

      case "Escape":
        if (isOpen) {
          e.preventDefault();
          closeDropdown(rt);
        }
        break;

      case "Home":
        if (isOpen) {
          e.preventDefault();
          items[0]?.focus();
        }
        break;

      case "End":
        if (isOpen) {
          e.preventDefault();
          items[items.length - 1]?.focus();
        }
        break;

      default:
        // Typeahead: jump to the first item whose text starts with the buffer.
        if (
          isOpen &&
          e.key.length === 1 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey
        ) {
          if (rt.typeaheadTimer) clearTimeout(rt.typeaheadTimer);
          rt.typeaheadBuffer += e.key.toLowerCase();
          const match = items.find((item) =>
            (item.textContent ?? "")
              .trim()
              .toLowerCase()
              .startsWith(rt.typeaheadBuffer),
          );
          if (match) match.focus();
          rt.typeaheadTimer = setTimeout(() => {
            rt.typeaheadBuffer = "";
          }, 500);
        }
        break;
    }
  };

  const initDropdown = (dropdown: HTMLElement): void => {
    const toggle = dropdown.querySelector<HTMLElement>(".vd-dropdown-toggle");
    const menu = dropdown.querySelector<HTMLElement>(".vd-dropdown-menu");
    if (!toggle || !menu) return;
    // Only wire a toggle/menu that belong directly to this container (guards
    // against a wrapper whose only toggle/menu live in a nested dropdown).
    if (
      toggle.closest(".vd-dropdown") !== dropdown ||
      menu.closest(".vd-dropdown") !== dropdown
    ) {
      return;
    }

    // ARIA — preserve a component-authored aria-haspopup (e.g. VdMenu's "menu").
    if (!toggle.hasAttribute("aria-haspopup")) {
      toggle.setAttribute("aria-haspopup", "true");
    }
    toggle.setAttribute("aria-expanded", "false");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-hidden", "true");

    const rt: DropdownRuntime = {
      dropdown,
      toggle,
      menu,
      typeaheadBuffer: "",
      typeaheadTimer: null,
    };
    runtimes.push(rt);

    // Delegated click on the container: toggle click toggles; item click selects.
    const onClick = (e: MouseEvent): void => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;

      const toggleHit = t.closest<HTMLElement>(".vd-dropdown-toggle");
      if (toggleHit && toggleHit.closest(".vd-dropdown") === dropdown) {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown(rt);
        return;
      }

      const itemHit = t.closest<HTMLElement>(".vd-dropdown-item");
      if (itemHit && ownedBy(rt, itemHit) && !isDisabledItem(itemHit)) {
        e.preventDefault();
        selectItem(rt, itemHit);
      }
    };
    dropdown.addEventListener("click", onClick);
    cleanups.push(() => dropdown.removeEventListener("click", onClick));

    // Delegated keydown on the container: reachable from the toggle and items.
    const onKeydown = (e: KeyboardEvent): void => handleKeydown(e, rt);
    dropdown.addEventListener("keydown", onKeydown);
    cleanups.push(() => dropdown.removeEventListener("keydown", onKeydown));

    // Outside-click closes (without stealing focus back to the toggle).
    const onDocClick = (e: MouseEvent): void => {
      const t = e.target instanceof Node ? e.target : null;
      if (t && !dropdown.contains(t) && menu.classList.contains("is-open")) {
        closeDropdown(rt, false);
      }
    };
    document.addEventListener("click", onDocClick);
    cleanups.push(() => document.removeEventListener("click", onDocClick));

    cleanups.push(() => {
      if (rt.typeaheadTimer) clearTimeout(rt.typeaheadTimer);
    });
  };

  const resolve = (
    target?: HTMLElement | string,
  ): DropdownRuntime | undefined => {
    if (runtimes.length === 0) return undefined;
    if (target === undefined) {
      return runtimes.length === 1 ? runtimes[0] : undefined;
    }
    const el =
      typeof target === "string"
        ? (root.value?.querySelector<HTMLElement>(target) ??
          document.querySelector<HTMLElement>(target))
        : target;
    if (!el) return undefined;
    return runtimes.find(
      (rt) => rt.dropdown === el || rt.dropdown.contains(el),
    );
  };

  onMounted(() => {
    const scope = root.value;
    if (!scope) return;
    // Match the vanilla `Vanduo.queryAll` semantics: the root itself counts
    // when it is the `.vd-dropdown` (e.g. VdMenu's root ref), plus descendants.
    const dropdowns: HTMLElement[] = [];
    if (scope.matches(".vd-dropdown")) dropdowns.push(scope);
    scope
      .querySelectorAll<HTMLElement>(".vd-dropdown")
      .forEach((el) => dropdowns.push(el));
    dropdowns.forEach((dropdown) => initDropdown(dropdown));
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    runtimes.length = 0;
  });

  return {
    open(target) {
      const rt = resolve(target);
      if (rt) openDropdown(rt);
    },
    close(target) {
      const rt = resolve(target);
      if (rt) closeDropdown(rt);
    },
  };
}
