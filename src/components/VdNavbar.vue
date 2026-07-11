<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from "vue";
import { useNavbarGlassScroll } from "../composables/useNavbarGlassScroll";

interface Props {
  /** Surface treatment. `glass`/`transparent` get scroll-activated framing. */
  variant?: "solid" | "transparent" | "glass";
  /** Apply the dark navbar theme (orthogonal to `variant`). */
  dark?: boolean;
  /** Positioning modifier. */
  position?: "static" | "fixed" | "fixed-bottom" | "sticky";
  /** Scroll distance (px) before `vd-navbar-scrolled` engages for glass/transparent. */
  scrollThreshold?: number;
  /** Accessible label for the mobile hamburger toggle. */
  toggleLabel?: string;
  /** Close the mobile menu when a non-dropdown nav link is clicked. */
  closeOnNavigate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "solid",
  dark: false,
  position: "static",
  scrollThreshold: undefined,
  toggleLabel: "Toggle navigation",
  closeOnNavigate: true,
});

const emit = defineEmits<{
  open: [];
  close: [];
  toggle: [open: boolean];
}>();

const navbarRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const toggleRef = ref<HTMLButtonElement | null>(null);
const isOpen = ref(false);

const menuId = `vd-navbar-menu-${useId()}`;

// Scroll-aware glass/transparent framing is delegated wholesale to the
// carried composable; this component is not a second writer of the scrolled
// state — it only renders the class the composable resolves.
const isScrolled = useNavbarGlassScroll(navbarRef);

const rootClasses = computed(() => [
  "vd-navbar",
  props.variant === "transparent" ? "vd-navbar-transparent" : null,
  props.variant === "glass" ? "vd-navbar-glass" : null,
  props.dark ? "vd-navbar-dark" : null,
  props.position === "fixed" ? "vd-navbar-fixed" : null,
  props.position === "fixed-bottom" ? "vd-navbar-fixed-bottom" : null,
  props.position === "sticky" ? "vd-navbar-sticky" : null,
  isScrolled.value ? "vd-navbar-scrolled" : null,
]);

/**
 * Resolve the collapse breakpoint from `--vd-breakpoint-lg` so CSS stays the
 * source of truth; falls back to 992 like `framework/js/components/navbar.js`.
 */
const getBreakpoint = (): number => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--vd-breakpoint-lg")
    .trim();
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 992 : parsed;
};

const closeSubmenus = (): void => {
  menuRef.value
    ?.querySelectorAll(".vd-navbar-dropdown-menu.is-open")
    .forEach((el) => el.classList.remove("is-open"));
};

const openMenu = (): void => {
  if (isOpen.value) return;
  isOpen.value = true;
  document.body.classList.add("body-navbar-open");
  emit("open");
  emit("toggle", true);
};

const closeMenu = (returnFocus = false): void => {
  if (!isOpen.value) return;
  isOpen.value = false;
  closeSubmenus();
  document.body.classList.remove("body-navbar-open");
  if (returnFocus) toggleRef.value?.focus();
  emit("close");
  emit("toggle", false);
};

const onToggleClick = (): void => {
  if (isOpen.value) closeMenu();
  else openMenu();
};

const onDocumentKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Escape" && isOpen.value) closeMenu(true);
};

const onDocumentClick = (event: MouseEvent): void => {
  if (!isOpen.value) return;
  const navbar = navbarRef.value;
  const target = event.target as Node | null;
  if (navbar && target && !navbar.contains(target)) closeMenu();
};

let resizeTimer: ReturnType<typeof setTimeout> | undefined;
const onResize = (): void => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (window.innerWidth >= getBreakpoint() && isOpen.value) closeMenu();
  }, 250);
};

/**
 * Delegated menu click: below the breakpoint a `.vd-navbar-dropdown` parent
 * link toggles its submenu instead of navigating; a plain link optionally
 * closes the menu so SPA navigation doesn't leave it hanging open.
 */
const onMenuClick = (event: MouseEvent): void => {
  const target = event.target as HTMLElement | null;
  const link = target?.closest(".vd-nav-link, .nav-link") as HTMLElement | null;
  if (!link || !menuRef.value?.contains(link)) return;

  const parent = link.parentElement;
  const isDropdownParent =
    !!parent && parent.classList.contains("vd-navbar-dropdown");

  if (isDropdownParent) {
    if (window.innerWidth < getBreakpoint()) {
      event.preventDefault();
      parent
        .querySelector(".vd-navbar-dropdown-menu")
        ?.classList.toggle("is-open");
    }
    return;
  }

  if (props.closeOnNavigate) closeMenu();
};

const onOverlayClick = (): void => closeMenu();

onMounted(() => {
  document.addEventListener("keydown", onDocumentKeydown);
  document.addEventListener("click", onDocumentClick);
  window.addEventListener("resize", onResize);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onDocumentKeydown);
  document.removeEventListener("click", onDocumentClick);
  window.removeEventListener("resize", onResize);
  clearTimeout(resizeTimer);
  document.body.classList.remove("body-navbar-open");
});

defineExpose({
  isOpen,
  open: openMenu,
  close: closeMenu,
  toggle: onToggleClick,
});
</script>

<template>
  <nav
    ref="navbarRef"
    :class="rootClasses"
    :data-scroll-threshold="scrollThreshold"
  >
    <div class="vd-navbar-container">
      <div v-if="$slots.brand" class="vd-navbar-brand">
        <slot name="brand" />
      </div>

      <button
        ref="toggleRef"
        type="button"
        class="vd-navbar-toggle"
        :class="{ 'is-active': isOpen }"
        :aria-label="toggleLabel"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :aria-controls="menuId"
        @click.stop.prevent="onToggleClick"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div
        :id="menuId"
        ref="menuRef"
        class="vd-navbar-menu"
        :class="{ 'is-open': isOpen }"
        :aria-hidden="isOpen ? 'false' : 'true'"
        @click="onMenuClick"
      >
        <slot />
        <div v-if="$slots.actions" class="vd-navbar-actions">
          <slot name="actions" />
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        class="vd-navbar-overlay"
        :class="{ 'is-active': isOpen }"
        @click="onOverlayClick"
      />
    </Teleport>
  </nav>
</template>
