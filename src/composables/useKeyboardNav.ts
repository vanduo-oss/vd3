import { ref, type Ref } from "vue";

export interface UseKeyboardNavOptions {
  itemSelector: string;
  onSelect?: (index: number) => void;
  onEscape?: () => void;
}

export const useKeyboardNav = (
  container: Ref<HTMLElement | null>,
  options: UseKeyboardNavOptions,
): { activeIndex: Ref<number>; setItems: (count: number) => void } => {
  const activeIndex = ref(0);
  let count = 0;

  const items = (): HTMLElement[] => {
    if (!container.value) return [];
    return Array.from(
      container.value.querySelectorAll<HTMLElement>(options.itemSelector),
    );
  };

  const focusItem = (index: number): void => {
    const list = items();
    const target = list[index];
    if (target) {
      target.focus();
      activeIndex.value = index;
    }
  };

  const onKeydown = (event: KeyboardEvent): void => {
    const list = items();
    if (list.length === 0) return;
    const max = list.length - 1;
    let next = activeIndex.value;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = Math.min(max, activeIndex.value + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = Math.max(0, activeIndex.value - 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = max;
        break;
      case "Enter":
        options.onSelect?.(activeIndex.value);
        return;
      case "Escape":
        options.onEscape?.();
        return;
      default:
        return;
    }
    event.preventDefault();
    focusItem(next);
  };

  if (typeof window !== "undefined" && container.value) {
    container.value.addEventListener("keydown", onKeydown);
  }

  const setItems = (next: number): void => {
    count = next;
    if (activeIndex.value >= count) activeIndex.value = Math.max(0, count - 1);
  };

  return { activeIndex, setItems };
};
