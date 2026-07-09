import { onMounted, onUnmounted, ref, type Ref } from "vue";

export const useScrollspy = (
  ids: string[],
  options: { offset?: number; rootMargin?: string } = {},
): { activeId: Ref<string | null> } => {
  const activeId = ref<string | null>(ids[0] ?? null);
  const offset = options.offset ?? 96;

  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) return;

    const visible = new Set<string>();

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const firstVisible = ids.find((id) => visible.has(id));
        if (firstVisible) activeId.value = firstVisible;
      },
      {
        rootMargin: options.rootMargin ?? `-${offset}px 0px -60% 0px`,
        threshold: 0,
      },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
  });

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
  });

  return { activeId };
};
