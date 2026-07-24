import { onMounted, onUnmounted, ref, type Ref } from "vue";

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

  // Attach in onMounted so the template ref is populated (a synchronous
  // attach in setup() would see a null container and silently do nothing);
  // capture the resolved element so teardown detaches the exact same node.
  let resolved: HTMLElement | null = null;

  onMounted(() => {
    if (typeof window === "undefined") return;
    resolved = container.value;
    resolved?.addEventListener("keydown", onKeydown);
  });

  onUnmounted(() => {
    resolved?.removeEventListener("keydown", onKeydown);
    resolved = null;
  });

  const setItems = (next: number): void => {
    if (activeIndex.value >= next) activeIndex.value = Math.max(0, next - 1);
  };

  return { activeIndex, setItems };
};
