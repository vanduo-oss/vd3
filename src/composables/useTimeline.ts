import { onMounted, onUnmounted, type Ref } from "vue";

export interface UseTimelineOptions {
  /**
   * vd3 extension: per-item reveal stagger step in milliseconds
   * (vanilla constant `STAGGER_MS`). Default `140`.
   */
  staggerMs?: number;
  /**
   * vd3 extension: cap applied to the stagger index so late items share the
   * same delay (vanilla constant `MAX_STAGGER_INDEX`). Default `7`.
   */
  maxStaggerIndex?: number;
  /**
   * vd3 extension: autoplay step interval in milliseconds for
   * `.vd-timeline-playback` containers (vanilla constant
   * `PLAY_INTERVAL_MS`). Default `800`.
   */
  playIntervalMs?: number;
}

export interface TimelineApi {
  /**
   * Reveal the next unrevealed item of every wired `.vd-timeline-playback`
   * container (no-op for observer-driven timelines).
   */
  stepNext(): void;
  /** Unreveal the most recently revealed item of every playback container. */
  stepPrev(): void;
  /** Start auto-advancing every playback container. */
  play(): void;
  /** Stop auto-advancing and clear pending timers. */
  pause(): void;
  /**
   * vd3 extension: re-scan the root and wire `.vd-timeline-animated`
   * containers added since mount. Idempotent — already-wired containers are
   * skipped.
   */
  refresh(): void;
}

const STAGGER_MS = 140;
const MAX_STAGGER_INDEX = 7;
const PLAY_INTERVAL_MS = 800;

interface PlaybackApi {
  stepNext(): void;
  stepPrev(): void;
  play(): void;
  pause(): void;
}

function countRevealedPrefix(items: HTMLElement[]): number {
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    if (!items[i].classList.contains("is-revealed")) break;
    count++;
  }
  return count;
}

/**
 * Ports framework/js/components/timeline.js — scans `root` (including the
 * root element itself) for `.vd-timeline.vd-timeline-animated` containers and
 * wires the staggered reveal: each `.vd-timeline-item` child gets a
 * `--vd-timeline-reveal-delay` custom property (140 ms steps, index capped at
 * 7) and gains `.is-revealed` when it intersects the viewport (rootMargin
 * `0px 0px -10% 0px`, threshold 0.15, unobserved after reveal). When
 * `prefers-reduced-motion: reduce` matches or IntersectionObserver is
 * unavailable every item is revealed immediately instead.
 *
 * Containers that also carry `.vd-timeline-playback` start unrevealed and are
 * stepped manually: `[data-vd-timeline-prev|next|play|pause]` buttons in the
 * container's parent (fallback `document.body`) reveal/unreveal the prefix
 * boundary item, autoplay advances every 800 ms and auto-pauses at the end,
 * and the buttons keep `disabled` / `aria-disabled` / `aria-pressed` state.
 *
 * Unlike the old shim (which called `VanduoTimeline.destroyAll()`), teardown
 * removes only this instance's listeners, observers, and timers. The returned
 * controller (vd3 extension, ignorable) mirrors the vanilla playback API plus
 * `refresh()` for dynamically added containers.
 */
export function useTimeline(
  root: Ref<HTMLElement | null>,
  options?: UseTimelineOptions,
): TimelineApi {
  const staggerMs = options?.staggerMs ?? STAGGER_MS;
  const maxStaggerIndex = options?.maxStaggerIndex ?? MAX_STAGGER_INDEX;
  const playIntervalMs = options?.playIntervalMs ?? PLAY_INTERVAL_MS;

  const wired = new Set<HTMLElement>();
  const cleanups: Array<() => void> = [];
  const playbacks: PlaybackApi[] = [];

  const initPlayback = (
    container: HTMLElement,
    items: HTMLElement[],
  ): PlaybackApi => {
    items.forEach((item) => {
      item.classList.remove("is-revealed");
    });

    const scope = container.parentElement || document.body;
    const prevBtn = scope.querySelector<HTMLButtonElement>(
      "[data-vd-timeline-prev]",
    );
    const nextBtn = scope.querySelector<HTMLButtonElement>(
      "[data-vd-timeline-next]",
    );
    const playBtn = scope.querySelector<HTMLButtonElement>(
      "[data-vd-timeline-play]",
    );
    const pauseBtn = scope.querySelector<HTMLButtonElement>(
      "[data-vd-timeline-pause]",
    );

    let playTimer: ReturnType<typeof setTimeout> | null = null;
    let isPlaying = false;
    let playToken = 0;

    const updateNavButtons = (): void => {
      const k = countRevealedPrefix(items);
      const n = items.length;
      if (prevBtn) {
        const atStart = k === 0;
        prevBtn.disabled = atStart;
        prevBtn.setAttribute("aria-disabled", atStart ? "true" : "false");
      }
      if (nextBtn) {
        const atEnd = k >= n;
        nextBtn.disabled = atEnd;
        nextBtn.setAttribute("aria-disabled", atEnd ? "true" : "false");
      }
      if (playBtn) {
        playBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
      }
      if (pauseBtn) {
        pauseBtn.disabled = !isPlaying;
      }
    };

    const stepNext = (): void => {
      const k = countRevealedPrefix(items);
      if (k < items.length) {
        items[k].classList.add("is-revealed");
      }
      updateNavButtons();
    };

    const stepPrev = (): void => {
      const k = countRevealedPrefix(items);
      if (k > 0) {
        items[k - 1].classList.remove("is-revealed");
      }
      updateNavButtons();
    };

    const scheduleNext = (): void => {
      const token = ++playToken;
      playTimer = setTimeout(() => {
        playTimer = null;

        if (!isPlaying || token !== playToken) return;

        if (countRevealedPrefix(items) >= items.length) {
          pause();
          return;
        }

        stepNext();

        if (countRevealedPrefix(items) >= items.length) {
          pause();
          return;
        }

        scheduleNext();
      }, playIntervalMs);
    };

    const play = (): void => {
      if (isPlaying) return;
      isPlaying = true;
      scheduleNext();
      updateNavButtons();
    };

    const pause = (): void => {
      isPlaying = false;
      playToken++;
      if (playTimer) {
        clearTimeout(playTimer);
        playTimer = null;
      }
      updateNavButtons();
    };

    const addClick = (el: HTMLElement | null, fn: () => void): void => {
      if (!el) return;
      const handler = (e: Event): void => {
        e.preventDefault();
        fn();
      };
      el.addEventListener("click", handler);
      cleanups.push(() => el.removeEventListener("click", handler));
    };

    addClick(prevBtn, stepPrev);
    addClick(nextBtn, stepNext);
    addClick(playBtn, play);
    addClick(pauseBtn, pause);

    cleanups.push(() => pause());

    updateNavButtons();

    return { stepNext, stepPrev, play, pause };
  };

  const initInstance = (container: HTMLElement): void => {
    if (wired.has(container)) return;
    wired.add(container);

    const items = Array.from(container.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child.classList.contains("vd-timeline-item"),
    );

    items.forEach((item, i) => {
      const idx = Math.min(i, maxStaggerIndex);
      item.style.setProperty(
        "--vd-timeline-reveal-delay",
        idx * staggerMs + "ms",
      );
    });

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      items.forEach((item) => {
        item.classList.add("is-revealed");
      });
      return;
    }

    if (container.classList.contains("vd-timeline-playback")) {
      playbacks.push(initPlayback(container, items));
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      items.forEach((item) => {
        item.classList.add("is-revealed");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.15,
      },
    );

    items.forEach((item) => {
      observer.observe(item);
    });

    cleanups.push(() => observer.disconnect());
  };

  const scan = (): void => {
    const host = root.value;
    if (!host) return;
    if (host.matches(".vd-timeline.vd-timeline-animated")) {
      initInstance(host);
    }
    host
      .querySelectorAll<HTMLElement>(".vd-timeline.vd-timeline-animated")
      .forEach((el) => initInstance(el));
  };

  onMounted(scan);

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    playbacks.length = 0;
    wired.clear();
  });

  return {
    stepNext: () => playbacks.forEach((p) => p.stepNext()),
    stepPrev: () => playbacks.forEach((p) => p.stepPrev()),
    play: () => playbacks.forEach((p) => p.play()),
    pause: () => playbacks.forEach((p) => p.pause()),
    refresh: () => {
      if (typeof window === "undefined") return;
      scan();
    },
  };
}
