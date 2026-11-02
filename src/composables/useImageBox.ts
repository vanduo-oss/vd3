import { onMounted, onUnmounted, ref, type Ref } from "vue";
import { useFocusTrap } from "./useFocusTrap";

/**
 * Scans `root` for `[data-image-box]` triggers and wires a shared lightbox.
 * Click (or Enter/Space on non-interactive triggers) opens one
 * `.vd-image-box-backdrop` in `body`. Triggers that share a root and the same
 * `data-image-box-group` (empty group included) can be stepped with the
 * controller, on-screen buttons, or arrow keys.
 *
 * The shared backdrop is refcounted at module scope, created lazily on the
 * first mount and removed when the last consumer unmounts.
 *
 * SSR-safe: browser access lives inside `onMounted` / event handlers.
 */
export interface UseImageBoxOptions {
  /**
   * How many pixels the window may scroll from the opening position before
   * the box auto-dismisses. Defaults to 50. The first mounting consumer wins
   * because the backdrop is shared.
   */
  scrollThreshold?: number;
}

export interface ImageBoxChangeDetail {
  index: number;
  total: number;
  src: string;
  trigger: HTMLElement;
}

export interface ImageBoxController {
  open: (target?: HTMLElement | number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
  refresh: () => void;
}

const SCROLL_THRESHOLD_DEFAULT = 50;
const CLEAR_DELAY = 300;

interface TrapBinding {
  backdrop: Ref<HTMLElement | null>;
  activate: (options?: { focus?: boolean }) => void;
  deactivate: () => void;
}

interface BackdropState {
  backdrop: HTMLElement;
  container: HTMLElement;
  img: HTMLImageElement;
  closeBtn: HTMLButtonElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  counter: HTMLElement;
  caption: HTMLElement;
  currentTrigger: HTMLElement | null;
  gallery: HTMLElement[];
  galleryIndex: number;
  initialScrollY: number;
  isOpen: boolean;
  imgLoadHandler: (() => void) | null;
  cleanups: Array<() => void>;
}

let shared: BackdropState | null = null;
let refCount = 0;
const trapBindings: TrapBinding[] = [];

const resolveSource = (trigger: HTMLElement): string => {
  return (
    trigger.dataset.imageBoxFullSrc ||
    trigger.dataset.imageBoxSrc ||
    (trigger as HTMLImageElement).src ||
    (trigger as HTMLAnchorElement).href ||
    ""
  );
};

const collectGallery = (trigger: HTMLElement): HTMLElement[] => {
  const root = trigger.closest<HTMLElement>("[data-vd-image-box-root]");
  const scope = root ?? trigger.parentElement ?? document.body;
  const group = trigger.dataset.imageBoxGroup ?? "";
  return Array.from(
    scope.querySelectorAll<HTMLElement>("[data-image-box]"),
  ).filter((el) => (el.dataset.imageBoxGroup ?? "") === group);
};

const updateChrome = (b: BackdropState): void => {
  const total = b.gallery.length;
  const multiple = total > 1;
  b.prevBtn.hidden = !multiple;
  b.nextBtn.hidden = !multiple;
  b.counter.hidden = !multiple;
  b.counter.textContent = multiple ? `${b.galleryIndex + 1} / ${total}` : "";
  b.gallery.forEach((el, index) => {
    const selected = index === b.galleryIndex;
    el.classList.toggle("is-active", selected);
    if (selected) el.setAttribute("aria-selected", "true");
    else el.removeAttribute("aria-selected");
  });
};

const clearGalleryChrome = (b: BackdropState): void => {
  b.gallery.forEach((el) => {
    el.classList.remove("is-active");
    el.removeAttribute("aria-selected");
  });
};

const paintTrigger = (trigger: HTMLElement): boolean => {
  const b = shared;
  if (!b) return false;
  const imgSrc = resolveSource(trigger);
  if (!imgSrc) {
    console.warn(
      "[Vanduo ImageBox] No image source found for trigger:",
      trigger,
    );
    return false;
  }

  const gallery = collectGallery(trigger);
  b.gallery = gallery.length > 0 ? gallery : [trigger];
  b.galleryIndex = Math.max(0, b.gallery.indexOf(trigger));
  b.currentTrigger = trigger;
  b.img.src = imgSrc;
  b.img.alt = (trigger as HTMLImageElement).alt || "";

  const captionText =
    trigger.dataset.imageBoxCaption || (trigger as HTMLImageElement).alt || "";
  if (captionText) {
    b.caption.textContent = captionText;
    b.caption.style.display = "block";
  } else {
    b.caption.style.display = "none";
  }
  updateChrome(b);

  if (!b.img.complete) {
    b.img.style.opacity = "0";
    if (b.imgLoadHandler) {
      b.img.removeEventListener("load", b.imgLoadHandler);
    }
    const handler = (): void => {
      b.img.style.opacity = "";
    };
    b.imgLoadHandler = handler;
    b.img.addEventListener("load", handler, { once: true });
  }
  return true;
};

const changeDetail = (b: BackdropState): ImageBoxChangeDetail => ({
  index: b.galleryIndex,
  total: b.gallery.length,
  src: b.img.src,
  trigger: b.currentTrigger ?? b.gallery[b.galleryIndex]!,
});

const activateSharedTrap = (): void => {
  const binding = trapBindings[trapBindings.length - 1];
  if (!binding || !shared) return;
  binding.backdrop.value = shared.backdrop;
  binding.activate({ focus: false });
};

const deactivateSharedTrap = (): void => {
  for (const binding of trapBindings) binding.deactivate();
};

const openBox = (trigger: HTMLElement): void => {
  const b = shared;
  if (!b || b.isOpen) return;
  if (!paintTrigger(trigger)) return;

  b.isOpen = true;
  b.initialScrollY = window.scrollY;

  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;
  document.body.style.setProperty(
    "--vd-scrollbar-width",
    `${scrollbarWidth}px`,
  );
  document.body.classList.add("body-image-box-open");
  b.backdrop.classList.add("is-visible");
  b.backdrop.focus();
  activateSharedTrap();

  const src = resolveSource(trigger);
  trigger.dispatchEvent(
    new CustomEvent("imageBox:open", { bubbles: true, detail: { src } }),
  );
  trigger.dispatchEvent(
    new CustomEvent<ImageBoxChangeDetail>("imageBox:change", {
      bubbles: true,
      detail: changeDetail(b),
    }),
  );
};

const closeBox = (): void => {
  const b = shared;
  if (!b || !b.isOpen) return;

  b.isOpen = false;
  b.backdrop.classList.remove("is-visible");
  deactivateSharedTrap();
  document.body.classList.remove("body-image-box-open");
  document.body.style.removeProperty("--vd-scrollbar-width");
  clearGalleryChrome(b);

  if (b.currentTrigger) {
    b.currentTrigger.focus();
    b.currentTrigger.dispatchEvent(
      new CustomEvent("imageBox:close", { bubbles: true }),
    );
    b.currentTrigger = null;
  }

  window.setTimeout(() => {
    if (!b.isOpen) {
      if (b.imgLoadHandler) {
        b.img.removeEventListener("load", b.imgLoadHandler);
        b.imgLoadHandler = null;
      }
      b.img.src = "";
      b.img.alt = "";
    }
  }, CLEAR_DELAY);
};

const stepGallery = (delta: number): void => {
  const b = shared;
  if (!b?.isOpen || b.gallery.length < 2) return;
  const index = (b.galleryIndex + delta + b.gallery.length) % b.gallery.length;
  const trigger = b.gallery[index];
  if (!trigger || !paintTrigger(trigger)) return;
  trigger.dispatchEvent(
    new CustomEvent<ImageBoxChangeDetail>("imageBox:change", {
      bubbles: true,
      detail: changeDetail(b),
    }),
  );
};

const createButton = (className: string, label: string): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-label", label);
  button.hidden = true;
  return button;
};

const createBackdrop = (scrollThreshold: number): void => {
  const backdrop = document.createElement("div");
  backdrop.className = "vd-image-box-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", "Image viewer");
  backdrop.setAttribute("tabindex", "-1");

  const container = document.createElement("div");
  container.className = "vd-image-box-container";

  const img = document.createElement("img");
  img.className = "vd-image-box-img";
  img.alt = "";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "vd-image-box-close";
  closeBtn.setAttribute("aria-label", "Close image viewer");
  closeBtn.innerHTML = "&times;";

  const prevBtn = createButton("vd-image-box-prev", "Previous image");
  prevBtn.textContent = "‹";
  const nextBtn = createButton("vd-image-box-next", "Next image");
  nextBtn.textContent = "›";

  const counter = document.createElement("div");
  counter.className = "vd-image-box-counter";
  counter.setAttribute("aria-live", "polite");
  counter.hidden = true;

  const caption = document.createElement("div");
  caption.className = "vd-image-box-caption";

  container.appendChild(img);
  backdrop.appendChild(closeBtn);
  backdrop.appendChild(prevBtn);
  backdrop.appendChild(nextBtn);
  backdrop.appendChild(counter);
  backdrop.appendChild(container);
  backdrop.appendChild(caption);
  document.body.appendChild(backdrop);

  const state: BackdropState = {
    backdrop,
    container,
    img,
    closeBtn,
    prevBtn,
    nextBtn,
    counter,
    caption,
    currentTrigger: null,
    gallery: [],
    galleryIndex: 0,
    initialScrollY: 0,
    isOpen: false,
    imgLoadHandler: null,
    cleanups: [],
  };
  shared = state;

  const onBackdropClick = (e: MouseEvent): void => {
    if (e.target === backdrop || e.target === container) closeBox();
  };
  backdrop.addEventListener("click", onBackdropClick);
  state.cleanups.push(() =>
    backdrop.removeEventListener("click", onBackdropClick),
  );

  const onImgClick = (): void => closeBox();
  img.addEventListener("click", onImgClick);
  state.cleanups.push(() => img.removeEventListener("click", onImgClick));

  const onCloseClick = (): void => closeBox();
  closeBtn.addEventListener("click", onCloseClick);
  state.cleanups.push(() =>
    closeBtn.removeEventListener("click", onCloseClick),
  );

  const onPrev = (event: Event): void => {
    event.stopPropagation();
    stepGallery(-1);
  };
  const onNext = (event: Event): void => {
    event.stopPropagation();
    stepGallery(1);
  };
  prevBtn.addEventListener("click", onPrev);
  nextBtn.addEventListener("click", onNext);
  state.cleanups.push(() => prevBtn.removeEventListener("click", onPrev));
  state.cleanups.push(() => nextBtn.removeEventListener("click", onNext));

  const onKey = (e: KeyboardEvent): void => {
    if (!state.isOpen) return;
    if (e.key === "Escape") closeBox();
    if (e.key === "ArrowRight") {
      e.preventDefault();
      stepGallery(1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepGallery(-1);
    }
  };
  document.addEventListener("keydown", onKey);
  state.cleanups.push(() => document.removeEventListener("keydown", onKey));

  const onScroll = (): void => {
    if (!state.isOpen) return;
    const delta = Math.abs(window.scrollY - state.initialScrollY);
    if (delta > scrollThreshold) closeBox();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  state.cleanups.push(() => window.removeEventListener("scroll", onScroll));
};

const retainBackdrop = (scrollThreshold: number): void => {
  refCount += 1;
  if (!shared) createBackdrop(scrollThreshold);
};

const releaseBackdrop = (): void => {
  refCount -= 1;
  if (refCount > 0) return;
  refCount = 0;

  const b = shared;
  if (b) {
    if (b.isOpen) closeBox();
    b.cleanups.forEach((fn) => fn());
    b.cleanups.length = 0;
    b.backdrop.parentNode?.removeChild(b.backdrop);
  }
  shared = null;
};

const bindTrigger = (
  trigger: HTMLElement,
  cleanups: Array<() => void>,
): void => {
  if (trigger.dataset.imageBoxInitialized) return;
  trigger.dataset.imageBoxInitialized = "true";
  trigger.classList.add("vd-image-box-trigger");

  const local: Array<() => void> = [];

  if (trigger.tagName === "IMG") {
    const img = trigger as HTMLImageElement;
    if (img.complete && img.naturalWidth === 0) {
      trigger.classList.add("is-broken");
    }
    const onError = (): void => trigger.classList.add("is-broken");
    const onLoad = (): void => trigger.classList.remove("is-broken");
    trigger.addEventListener("error", onError);
    trigger.addEventListener("load", onLoad);
    local.push(() => trigger.removeEventListener("error", onError));
    local.push(() => trigger.removeEventListener("load", onLoad));
  }

  const onClick = (e: Event): void => {
    e.preventDefault();
    openBox(trigger);
  };
  trigger.addEventListener("click", onClick);
  local.push(() => trigger.removeEventListener("click", onClick));

  if (trigger.tagName !== "BUTTON" && trigger.tagName !== "A") {
    trigger.setAttribute("role", "button");
    trigger.setAttribute("tabindex", "0");
    if (!trigger.hasAttribute("aria-label")) {
      trigger.setAttribute("aria-label", "View enlarged image");
    }

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openBox(trigger);
      }
    };
    trigger.addEventListener("keydown", onKey);
    local.push(() => trigger.removeEventListener("keydown", onKey));
  }

  cleanups.push(() => {
    local.forEach((fn) => fn());
    trigger.classList.remove("vd-image-box-trigger", "is-active");
    trigger.removeAttribute("aria-selected");
    delete trigger.dataset.imageBoxInitialized;
  });
};

export function useImageBox(
  root: Ref<HTMLElement | null>,
  options: UseImageBoxOptions = {},
): ImageBoxController {
  const cleanups: Array<() => void> = [];
  const backdropRef = ref<HTMLElement | null>(null);
  const trap = useFocusTrap(backdropRef);
  const binding: TrapBinding = {
    backdrop: backdropRef,
    activate: trap.activate,
    deactivate: trap.deactivate,
  };
  let retained = false;
  let scope: HTMLElement | null = null;

  const refresh = (): void => {
    if (!scope) return;
    scope
      .querySelectorAll<HTMLElement>("[data-image-box]")
      .forEach((trigger) => bindTrigger(trigger, cleanups));
  };

  const open = (target?: HTMLElement | number): void => {
    refresh();
    if (!scope) return;
    const trigger =
      target instanceof HTMLElement
        ? target
        : scope
            .querySelectorAll<HTMLElement>("[data-image-box]")
            .item(typeof target === "number" ? target : 0);
    if (trigger) openBox(trigger);
  };

  onMounted(() => {
    if (typeof window === "undefined" || typeof document === "undefined")
      return;
    scope = root.value;
    if (!scope) return;

    scope.setAttribute("data-vd-image-box-root", "");
    retainBackdrop(options.scrollThreshold ?? SCROLL_THRESHOLD_DEFAULT);
    retained = true;
    trapBindings.push(binding);
    if (shared) backdropRef.value = shared.backdrop;
    refresh();
  });

  onUnmounted(() => {
    const index = trapBindings.indexOf(binding);
    if (index >= 0) trapBindings.splice(index, 1);
    binding.deactivate();
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    scope?.removeAttribute("data-vd-image-box-root");
    scope = null;
    if (retained) {
      releaseBackdrop();
      retained = false;
    }
  });

  return {
    open,
    close: closeBox,
    next: () => stepGallery(1),
    prev: () => stepGallery(-1),
    refresh,
  };
}
