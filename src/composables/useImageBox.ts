import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Ports `framework/js/components/image-box.js` — scans `root` for
 * `[data-image-box]` triggers and wires lightbox-style image enlargement:
 * click (or Enter/Space on non-interactive triggers) opens a single shared
 * `.vd-image-box-backdrop` in `body`, showing the resolved full-size image
 * with an optional caption; the box dismisses on backdrop/image/close-button
 * click, Escape, or scrolling more than a threshold from the opening position,
 * restoring focus to the trigger.
 *
 * The vanilla layer is dropped: no DOM auto-scan/`Vanduo.register`, no
 * `window.VanduoImageBox` global. The shared backdrop is refcounted at module
 * scope (vanilla parity — one backdrop per document), created lazily on the
 * first mount and removed when the last consumer unmounts.
 *
 * SSR-safe: all browser access lives inside `onMounted` / event handlers, and
 * the module-scope refcount/backdrop are only ever touched client-side (the
 * same caveat documented on `useToast`).
 *
 * @param root    element scope scanned for `[data-image-box]` triggers.
 * @param options vd3 extension — see {@link UseImageBoxOptions}.
 */
export interface UseImageBoxOptions {
  /**
   * vd3 extension: how many pixels the window may scroll from the opening
   * position before the box auto-dismisses. Defaults to 50 (vanilla parity).
   * Because the backdrop is shared, this is applied when the backdrop is first
   * created (the first mounting consumer wins).
   */
  scrollThreshold?: number;
}

const SCROLL_THRESHOLD_DEFAULT = 50;
const CLEAR_DELAY = 300;

interface BackdropState {
  backdrop: HTMLElement;
  container: HTMLElement;
  img: HTMLImageElement;
  closeBtn: HTMLButtonElement;
  caption: HTMLElement;
  currentTrigger: HTMLElement | null;
  initialScrollY: number;
  isOpen: boolean;
  imgLoadHandler: (() => void) | null;
  cleanups: Array<() => void>;
}

// Module-scope shared backdrop (refcounted). Declared without touching the DOM
// so importing this module stays SSR-safe.
let shared: BackdropState | null = null;
let refCount = 0;

/** Resolve the lightbox source: full-src → src attr → element src → href. */
const resolveSource = (trigger: HTMLElement): string => {
  return (
    trigger.dataset.imageBoxFullSrc ||
    trigger.dataset.imageBoxSrc ||
    (trigger as HTMLImageElement).src ||
    (trigger as HTMLAnchorElement).href ||
    ""
  );
};

const openBox = (trigger: HTMLElement): void => {
  const b = shared;
  if (!b || b.isOpen) return;

  const imgSrc = resolveSource(trigger);
  if (!imgSrc) {
    // Vanilla warns and aborts; unlike vanilla we abort before flipping any
    // state, so a source-less trigger can't wedge the shared box open.
    // eslint-disable-next-line no-console
    console.warn(
      "[Vanduo ImageBox] No image source found for trigger:",
      trigger,
    );
    return;
  }

  b.currentTrigger = trigger;
  b.isOpen = true;
  b.initialScrollY = window.scrollY;

  const captionText =
    trigger.dataset.imageBoxCaption || (trigger as HTMLImageElement).alt || "";

  b.img.src = imgSrc;
  b.img.alt = (trigger as HTMLImageElement).alt || "";

  if (captionText) {
    b.caption.textContent = captionText;
    b.caption.style.display = "block";
  } else {
    b.caption.style.display = "none";
  }

  // Lock body scroll, compensating for the removed scrollbar.
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;
  document.body.style.setProperty(
    "--vd-scrollbar-width",
    `${scrollbarWidth}px`,
  );
  document.body.classList.add("body-image-box-open");

  b.backdrop.classList.add("is-visible");
  b.backdrop.focus();

  trigger.dispatchEvent(
    new CustomEvent("imageBox:open", {
      bubbles: true,
      detail: { src: imgSrc },
    }),
  );

  // Fade the image in once it finishes loading.
  if (!b.img.complete) {
    b.img.style.opacity = "0";
    const handler = (): void => {
      b.img.style.opacity = "";
    };
    b.imgLoadHandler = handler;
    b.img.addEventListener("load", handler, { once: true });
  }
};

const closeBox = (): void => {
  const b = shared;
  if (!b || !b.isOpen) return;

  b.isOpen = false;
  b.backdrop.classList.remove("is-visible");

  document.body.classList.remove("body-image-box-open");
  document.body.style.removeProperty("--vd-scrollbar-width");

  if (b.currentTrigger) {
    b.currentTrigger.focus();
    b.currentTrigger.dispatchEvent(
      new CustomEvent("imageBox:close", { bubbles: true }),
    );
    b.currentTrigger = null;
  }

  // Clear the source once the fade-out transition has finished.
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
  closeBtn.className = "vd-image-box-close";
  closeBtn.setAttribute("aria-label", "Close image viewer");
  closeBtn.innerHTML = "&times;";

  const caption = document.createElement("div");
  caption.className = "vd-image-box-caption";

  container.appendChild(img);
  backdrop.appendChild(closeBtn);
  backdrop.appendChild(container);
  backdrop.appendChild(caption);
  document.body.appendChild(backdrop);

  const state: BackdropState = {
    backdrop,
    container,
    img,
    closeBtn,
    caption,
    currentTrigger: null,
    initialScrollY: 0,
    isOpen: false,
    imgLoadHandler: null,
    cleanups: [],
  };
  shared = state;

  // Close on backdrop click, but not when clicking the image itself.
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

  const onEsc = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && state.isOpen) closeBox();
  };
  document.addEventListener("keydown", onEsc);
  state.cleanups.push(() => document.removeEventListener("keydown", onEsc));

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

/** Wire a single `[data-image-box]` trigger, registering teardown in `cleanups`. */
const bindTrigger = (
  trigger: HTMLElement,
  cleanups: Array<() => void>,
): void => {
  // Idempotent guard: a node scanned twice is only wired once.
  if (trigger.dataset.imageBoxInitialized) return;
  trigger.dataset.imageBoxInitialized = "true";
  trigger.classList.add("vd-image-box-trigger");

  const local: Array<() => void> = [];

  // Broken-image marking for <img> triggers.
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

  // Keyboard access for non-interactive triggers.
  if (trigger.tagName !== "BUTTON" && trigger.tagName !== "A") {
    trigger.setAttribute("role", "button");
    trigger.setAttribute("tabindex", "0");
    trigger.setAttribute("aria-label", "View enlarged image");

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
    trigger.classList.remove("vd-image-box-trigger");
    delete trigger.dataset.imageBoxInitialized;
  });
};

export function useImageBox(
  root: Ref<HTMLElement | null>,
  options: UseImageBoxOptions = {},
): void {
  const cleanups: Array<() => void> = [];
  let retained = false;

  onMounted(() => {
    if (typeof window === "undefined" || typeof document === "undefined")
      return;
    const scope = root.value;
    if (!scope) return;

    retainBackdrop(options.scrollThreshold ?? SCROLL_THRESHOLD_DEFAULT);
    retained = true;

    scope
      .querySelectorAll<HTMLElement>("[data-image-box]")
      .forEach((trigger) => bindTrigger(trigger, cleanups));
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    if (retained) {
      releaseBackdrop();
      retained = false;
    }
  });
}
