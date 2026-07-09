import { onMounted, onUnmounted, ref, type Ref } from "vue";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export const useFocusTrap = (
  container: Ref<HTMLElement | null>,
): {
  active: Ref<boolean>;
  activate: () => void;
  deactivate: () => void;
} => {
  const active = ref(false);

  const onKeydown = (event: KeyboardEvent): void => {
    if (!active.value || event.key !== "Tab" || !container.value) return;
    const focusables = Array.from(
      container.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const current = document.activeElement as HTMLElement | null;
    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const activate = (): void => {
    active.value = true;
    if (container.value) {
      const first =
        container.value.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    }
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
