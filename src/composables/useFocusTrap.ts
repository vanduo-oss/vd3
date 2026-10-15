import { onMounted, onUnmounted, ref, type Ref } from "vue";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Check whether an element is visible (not hidden via CSS or attributes). */
const isVisible = (el: HTMLElement): boolean => {
  if (el.hasAttribute("hidden")) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  const style = getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  return true;
};

export const useFocusTrap = (
  container: Ref<HTMLElement | null>,
): {
  active: Ref<boolean>;
  activate: () => void;
  deactivate: () => void;
} => {
  const active = ref(false);

  const getFocusables = (): HTMLElement[] => {
    if (!container.value) return [];
    return Array.from(
      container.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(
      (el) =>
        !el.hasAttribute("disabled") && el.tabIndex !== -1 && isVisible(el),
    );
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (!active.value || event.key !== "Tab" || !container.value) return;
    const focusables = getFocusables();
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const current = document.activeElement as HTMLElement | null;
    const containerEl = container.value;

    // Handle Shift+Tab when focus is on the container itself (tabindex="-1")
    // or outside the focusable list — wrap to the last element.
    if (event.shiftKey) {
      if (
        current === first ||
        current === containerEl ||
        !focusables.includes(current!)
      ) {
        event.preventDefault();
        last.focus();
      }
    } else {
      // Handle Tab when focus is on the last element or outside the list.
      if (current === last || !focusables.includes(current!)) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const activate = (): void => {
    active.value = true;
    const focusables = getFocusables();
    focusables[0]?.focus();
  };

  const deactivate = (): void => {
    active.value = false;
  };

  onMounted(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKeydown);
    }
  });

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", onKeydown);
    }
  });

  return { active, activate, deactivate };
};
