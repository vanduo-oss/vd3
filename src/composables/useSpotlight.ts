import { onMounted, onUnmounted, type Ref } from "vue";

export interface SpotlightStep {
  /** CSS selector (resolved per step against `document`) or the element itself. */
  target: string | Element;
  /** Optional heading rendered as `.vd-spotlight-title`. */
  title?: string;
  /** Optional body text rendered as `.vd-spotlight-description`. */
  description?: string;
  /** Vanilla-parity alias for `description` (used when `description` is absent). */
  content?: string;
}

export interface SpotlightStartOptions {
  /**
   * Element to restore focus to when the tour stops. Defaults to
   * `document.activeElement` at start time (vanilla parity).
   */
  trigger?: HTMLElement;
}

export interface UseSpotlightOptions {
  /**
   * vd3 extension: gap in pixels between the target and the tooltip
   * (vanilla constant `12`).
   */
  tooltipGap?: number;
  /**
   * vd3 extension: minimum distance in pixels the tooltip keeps from the
   * viewport edges (vanilla constant `8`).
   */
  viewportMargin?: number;
  /**
   * vd3 extension: number of animation frames the tooltip re-positions
   * across after a step change, so it converges while the smooth
   * `scrollIntoView` settles (vanilla constant `30`).
   */
  settleFrames?: number;
  /**
   * vd3 extension: button/label texts (vanilla hardcodes the English
   * strings `Back` / `Skip` / `Next` / `Done`).
   */
  labels?: {
    back?: string;
    skip?: string;
    next?: string;
    done?: string;
  };
}

export interface SpotlightApi {
  /**
   * Start a tour programmatically (vanilla `Spotlight.start(steps, options)`).
   * Starting while a tour is active stops the previous tour first; invalid
   * step entries are dropped and an empty result starts nothing.
   */
  start(steps: SpotlightStep[], options?: SpotlightStartOptions): void;
  /** Stop the active tour (no-op when none is running). */
  stop(): void;
  /** Advance to the next step (no-op on the last step). */
  next(): void;
  /** Return to the previous step (no-op on the first step). */
  prev(): void;
  /**
   * vd3 extension: re-scan the root and wire `[data-vd-spotlight]` triggers
   * added since mount. Idempotent — already-wired triggers are skipped.
   */
  refresh(): void;
}

interface NormalizedSpotlightStep {
  target: string | Element;
  title: string;
  description: string;
}

interface TourConfig {
  gap: number;
  margin: number;
  settleFrames: number;
  labels: { back: string; skip: string; next: string; done: string };
}

interface ActiveTour {
  owner: object;
  config: TourConfig;
  steps: NormalizedSpotlightStep[];
  currentStep: number;
  overlay: HTMLElement;
  tooltip: HTMLElement;
  cleanup: Array<() => void>;
  triggerElement: HTMLElement | null;
  currentTarget: Element | null;
}

const TOOLTIP_GAP = 12;
const VIEWPORT_MARGIN = 8;
const SETTLE_FRAMES = 30;

/**
 * The vanilla component is a page-global singleton: only one tour can run at
 * a time, and `start()` while active stops the previous tour. The active-tour
 * state therefore lives at module scope, shared by every composable instance
 * (browser-only — it is only ever touched from event handlers and mounted
 * hooks, so module evaluation stays SSR-safe).
 */
let activeTour: ActiveTour | null = null;

function normalizeStep(step: unknown): NormalizedSpotlightStep | null {
  if (!step || typeof step !== "object") return null;

  const candidate = step as Partial<SpotlightStep>;
  const target = candidate.target;
  const hasSelectorTarget = typeof target === "string" && target.trim() !== "";
  const hasElementTarget =
    typeof Element !== "undefined" && target instanceof Element;

  if (!hasSelectorTarget && !hasElementTarget) return null;

  const title = typeof candidate.title === "string" ? candidate.title : "";
  const description =
    typeof candidate.description === "string"
      ? candidate.description
      : typeof candidate.content === "string"
        ? candidate.content
        : "";

  return { target: target as string | Element, title, description };
}

function normalizeSteps(steps: unknown): NormalizedSpotlightStep[] {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((step) => normalizeStep(step))
    .filter((step): step is NormalizedSpotlightStep => step !== null);
}

function parseSteps(raw: string | null): NormalizedSpotlightStep[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    return normalizeSteps(JSON.parse(raw));
  } catch (error) {
    console.error("useSpotlight: invalid data-vd-spotlight payload.", error);
    return [];
  }
}

function positionTooltip(tour: ActiveTour, target: Element): void {
  const { tooltip } = tour;
  if (!target.isConnected) return;

  const { gap, margin } = tour.config;
  const rect = target.getBoundingClientRect();
  const tRect = tooltip.getBoundingClientRect();
  let top = rect.bottom + gap + window.scrollY;
  let left = rect.left + (rect.width - tRect.width) / 2 + window.scrollX;

  // Keep in viewport
  left = Math.max(
    margin,
    Math.min(left, window.innerWidth - tRect.width - margin),
  );
  if (top + tRect.height > window.innerHeight + window.scrollY) {
    top = rect.top - tRect.height - gap + window.scrollY;
  }

  tooltip.style.top = top + "px";
  tooltip.style.left = left + "px";
}

function showStep(tour: ActiveTour, index: number): void {
  const step = tour.steps[index];
  if (!step) return;

  const target =
    typeof step.target === "string"
      ? document.querySelector(step.target)
      : step.target;
  const { tooltip } = tour;
  const { labels } = tour.config;

  // Remove previous highlight
  document.querySelectorAll(".vd-spotlight-target").forEach((el) => {
    el.classList.remove("vd-spotlight-target");
  });

  // Highlight target
  if (target) {
    target.classList.add("vd-spotlight-target");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Build tooltip content
  const total = tour.steps.length;
  tooltip.innerHTML = "";
  tooltip.removeAttribute("aria-labelledby");
  tooltip.removeAttribute("aria-describedby");

  if (step.title) {
    const title = document.createElement("h4");
    title.className = "vd-spotlight-title";
    title.id = "vd-spotlight-title-" + index + "-" + Date.now();
    title.textContent = step.title;
    tooltip.appendChild(title);
    tooltip.setAttribute("aria-labelledby", title.id);
  }

  if (step.description) {
    const desc = document.createElement("p");
    desc.className = "vd-spotlight-description";
    desc.id = "vd-spotlight-description-" + index + "-" + Date.now();
    desc.textContent = step.description;
    tooltip.appendChild(desc);
    tooltip.setAttribute("aria-describedby", desc.id);
  }

  // Footer
  const footer = document.createElement("div");
  footer.className = "vd-spotlight-footer";
  footer.setAttribute("aria-label", "Step " + (index + 1) + " of " + total);

  const counter = document.createElement("span");
  counter.className = "vd-spotlight-counter";
  counter.textContent = index + 1 + " / " + total;

  const actions = document.createElement("div");
  actions.className = "vd-spotlight-actions";

  if (index > 0) {
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "vd-spotlight-btn";
    prevBtn.textContent = labels.back;
    prevBtn.addEventListener("click", () => prevStep());
    actions.appendChild(prevBtn);
  }

  const skipBtn = document.createElement("button");
  skipBtn.type = "button";
  skipBtn.className = "vd-spotlight-btn";
  skipBtn.textContent = labels.skip;
  skipBtn.addEventListener("click", () => stopTour());
  actions.appendChild(skipBtn);

  if (index < total - 1) {
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "vd-spotlight-btn vd-spotlight-btn-primary";
    nextBtn.textContent = labels.next;
    nextBtn.addEventListener("click", () => nextStep());
    actions.appendChild(nextBtn);
  } else {
    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.className = "vd-spotlight-btn vd-spotlight-btn-primary";
    doneBtn.textContent = labels.done;
    doneBtn.addEventListener("click", () => stopTour());
    actions.appendChild(doneBtn);
  }

  footer.appendChild(counter);
  footer.appendChild(actions);
  tooltip.appendChild(footer);

  // Position the tooltip near the target. A single measurement right after a
  // smooth scrollIntoView is unreliable: the scroll is still animating and the
  // target's final geometry may not exist yet (content-visibility sections
  // only render once scrolled into view). Re-position across the settle window
  // so the tooltip converges on the correct spot; the scroll/resize listeners
  // keep it there afterward.
  tour.currentTarget = target ?? null;
  if (target) {
    let frames = 0;
    const settle = (): void => {
      if (activeTour !== tour || tour.currentTarget !== target) return;
      positionTooltip(tour, target);
      if (frames++ < tour.config.settleFrames) requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  }

  document.dispatchEvent(
    new CustomEvent("spotlight:step", {
      detail: { index, step: index, total, data: step },
    }),
  );
}

function nextStep(): void {
  const tour = activeTour;
  if (!tour) return;
  if (tour.currentStep < tour.steps.length - 1) {
    tour.currentStep++;
    showStep(tour, tour.currentStep);
  }
}

function prevStep(): void {
  const tour = activeTour;
  if (!tour) return;
  if (tour.currentStep > 0) {
    tour.currentStep--;
    showStep(tour, tour.currentStep);
  }
}

function stopTour(): void {
  const tour = activeTour;
  if (!tour) return;

  const total = tour.steps.length;
  const detail = {
    completedSteps: total === 0 ? 0 : Math.min(tour.currentStep + 1, total),
    total,
    completed: total > 0 && tour.currentStep >= total - 1,
  };

  activeTour = null;

  document.querySelectorAll(".vd-spotlight-target").forEach((el) => {
    el.classList.remove("vd-spotlight-target");
  });

  tour.overlay.remove();
  tour.tooltip.remove();

  tour.cleanup.forEach((fn) => fn());
  tour.cleanup.length = 0;
  tour.currentTarget = null;

  if (
    tour.triggerElement &&
    tour.triggerElement.isConnected &&
    typeof tour.triggerElement.focus === "function"
  ) {
    tour.triggerElement.focus();
  }
  tour.triggerElement = null;

  document.dispatchEvent(new CustomEvent("spotlight:end", { detail }));
}

function startTour(
  steps: SpotlightStep[],
  startOptions: SpotlightStartOptions | undefined,
  config: TourConfig,
  owner: object,
): void {
  if (typeof document === "undefined") return;
  if (activeTour) stopTour();

  const normalizedSteps = normalizeSteps(steps);
  if (normalizedSteps.length === 0) return;

  const triggerElement =
    startOptions?.trigger ??
    (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null);

  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "vd-spotlight-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);

  // Create tooltip
  const tooltip = document.createElement("div");
  tooltip.className = "vd-spotlight-tooltip";
  tooltip.setAttribute("role", "dialog");
  tooltip.setAttribute("aria-modal", "true");
  tooltip.tabIndex = -1;
  document.body.appendChild(tooltip);

  const tour: ActiveTour = {
    owner,
    config,
    steps: normalizedSteps,
    currentStep: 0,
    overlay,
    tooltip,
    cleanup: [],
    triggerElement,
    currentTarget: null,
  };
  activeTour = tour;

  // ESC to close
  const escHandler = (e: KeyboardEvent): void => {
    if (e.key === "Escape") stopTour();
  };
  document.addEventListener("keydown", escHandler);
  tour.cleanup.push(() => document.removeEventListener("keydown", escHandler));

  // Overlay click to close
  overlay.addEventListener("click", () => stopTour());

  // Keep the tooltip glued to its target while active — through the smooth
  // scrollIntoView and any late layout (e.g. content-visibility sections that
  // only render their real geometry once scrolled into view).
  const reposition = (): void => {
    if (activeTour === tour && tour.currentTarget) {
      positionTooltip(tour, tour.currentTarget);
    }
  };
  window.addEventListener("scroll", reposition, { passive: true });
  window.addEventListener("resize", reposition);
  tour.cleanup.push(() => window.removeEventListener("scroll", reposition));
  tour.cleanup.push(() => window.removeEventListener("resize", reposition));

  showStep(tour, tour.currentStep);
}

/**
 * Ports framework/js/components/spotlight.js — a guided feature-discovery
 * tour. Scans `root` (including the root element itself) for
 * `[data-vd-spotlight]` triggers whose attribute holds a JSON array of steps
 * (`{ target, title?, description? }`, with `content` accepted as a
 * `description` alias; entries without a usable target are dropped and
 * malformed JSON logs a console error and stays inert). Clicking a trigger
 * starts the tour: a body-appended `.vd-spotlight-overlay` (`aria-hidden`)
 * dims the page and a `.vd-spotlight-tooltip` (`role="dialog"`,
 * `aria-modal="true"`) renders each step's title/description (ids wired to
 * `aria-labelledby` / `aria-describedby`), an "i / n" counter, and
 * Back/Skip/Next/Done buttons. The step's target gains `.vd-spotlight-target`
 * (the CSS box-shadow cutout) and is scrolled into view; the tooltip tracks
 * it through scroll/resize and a requestAnimationFrame settle window. Escape
 * and overlay click stop the tour. Stopping removes all generated DOM and
 * classes, restores focus to the trigger, and dispatches `spotlight:end` on
 * `document` with `{ completedSteps, total, completed }`; every step
 * dispatches `spotlight:step` with `{ index, step, total, data }`.
 *
 * Only one tour is active process-wide (vanilla singleton parity):
 * `start()` while a tour is running stops the previous tour first.
 *
 * Unlike the old shim (which called `VanduoSpotlight.destroyAll()` on
 * unmount), teardown removes only this instance's trigger listeners — plus
 * the active tour when this instance started it. The returned controller
 * (vd3 extension, ignorable) mirrors the vanilla programmatic API
 * (`start` / `stop` / `next` / `prev`) plus `refresh()` for triggers added
 * after mount.
 */
export function useSpotlight(
  root: Ref<HTMLElement | null>,
  options?: UseSpotlightOptions,
): SpotlightApi {
  const owner: object = {};
  const config: TourConfig = {
    gap: options?.tooltipGap ?? TOOLTIP_GAP,
    margin: options?.viewportMargin ?? VIEWPORT_MARGIN,
    settleFrames: options?.settleFrames ?? SETTLE_FRAMES,
    labels: {
      back: options?.labels?.back ?? "Back",
      skip: options?.labels?.skip ?? "Skip",
      next: options?.labels?.next ?? "Next",
      done: options?.labels?.done ?? "Done",
    },
  };

  const wired = new WeakSet<HTMLElement>();
  const cleanups: Array<() => void> = [];

  const wire = (trigger: HTMLElement): void => {
    if (wired.has(trigger)) return;
    wired.add(trigger);

    const onClick = (event: Event): void => {
      event.preventDefault();
      const steps = parseSteps(trigger.getAttribute("data-vd-spotlight"));
      if (steps.length === 0) return;
      startTour(steps, { trigger }, config, owner);
    };
    trigger.addEventListener("click", onClick);
    cleanups.push(() => trigger.removeEventListener("click", onClick));
  };

  const scan = (): void => {
    const host = root.value;
    if (!host) return;
    if (host.matches("[data-vd-spotlight]")) wire(host);
    host.querySelectorAll<HTMLElement>("[data-vd-spotlight]").forEach(wire);
  };

  onMounted(scan);

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    if (activeTour && activeTour.owner === owner) stopTour();
  });

  return {
    start: (steps, startOptions) =>
      startTour(steps, startOptions, config, owner),
    stop: () => stopTour(),
    next: () => nextStep(),
    prev: () => prevStep(),
    refresh: () => {
      if (typeof window === "undefined") return;
      scan();
    },
  };
}
