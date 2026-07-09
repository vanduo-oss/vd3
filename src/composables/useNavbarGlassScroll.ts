import { onMounted, onUnmounted, ref, type Ref } from "vue";

/**
 * Reproduces `framework/js/components/navbar.js` initScrollWatcher:
 * toggles scroll-aware glass/transparent behaviour for a navbar element.
 * Threshold: `data-scroll-threshold` attribute (px) or the navbar's own height.
 */
export function useNavbarGlassScroll(
  navbarRef: Ref<HTMLElement | null>,
): Ref<boolean> {
  const isScrolled = ref(false);
  let onScroll: (() => void) | null = null;

  onMounted(() => {
    const navbar = navbarRef.value;
    if (!navbar) return;

    const isGlass = navbar.classList.contains("vd-navbar-glass");
    const isTransparent = navbar.classList.contains("vd-navbar-transparent");
    if (!isGlass && !isTransparent) return;

    const getThreshold = (): number => {
      const attr = parseInt(navbar.dataset.scrollThreshold ?? "", 10);
      return Number.isNaN(attr) ? navbar.offsetHeight || 60 : attr;
    };

    onScroll = (): void => {
      isScrolled.value = window.scrollY > getThreshold();
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  });

  onUnmounted(() => {
    if (onScroll) {
      window.removeEventListener("scroll", onScroll);
      onScroll = null;
    }
  });

  return isScrolled;
}
