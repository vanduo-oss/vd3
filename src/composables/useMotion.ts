import { ref, computed, type Ref, type ComputedRef } from "vue";
import { getStoragePrefix, getThemePersistence } from "./useTheme";
import { MOTION_DURATIONS } from "../theme/generated/tokens.data";

export { MOTION_DURATIONS };

export type MotionMode = "auto" | "full" | "reduce" | "off";

const VALID_MODES: readonly MotionMode[] = [
  "auto",
  "full",
  "reduce",
  "off",
] as const;

const isClient = (): boolean =>
  typeof window !== "undefined" && typeof document !== "undefined";

const getMotionStorageKey = (): string => `${getStoragePrefix()}motion`;

const readStoredMotion = (): MotionMode => {
  if (!isClient() || !getThemePersistence()) return "auto";
  try {
    const val = window.localStorage.getItem(getMotionStorageKey());
    if (val && (VALID_MODES as readonly string[]).includes(val)) {
      return val as MotionMode;
    }
  } catch {
    /* storage unavailable */
  }
  return "auto";
};

const _motionMode = ref<MotionMode>("auto");
export const motionMode: Readonly<Ref<MotionMode>> = _motionMode;

export function fibDurationForHeight(height: number): number {
  if (height <= 144) return 144;
  if (height <= 377) return 233;
  if (height <= 987) return 377;
  return 610;
}

export function getMotion(): MotionMode {
  return _motionMode.value;
}

export function setMotion(
  mode: MotionMode,
  opts?: { persist?: boolean },
): void {
  if (!VALID_MODES.includes(mode)) return;
  _motionMode.value = mode;

  if (isClient()) {
    if (mode === "auto") {
      document.documentElement.removeAttribute("data-motion");
    } else {
      document.documentElement.setAttribute("data-motion", mode);
    }

    const shouldPersist = opts?.persist ?? getThemePersistence();
    if (shouldPersist) {
      try {
        if (mode === "auto") {
          window.localStorage.removeItem(getMotionStorageKey());
        } else {
          window.localStorage.setItem(getMotionStorageKey(), mode);
        }
      } catch {
        /* storage unavailable */
      }
    }
  }
}

const osReduced = ref(false);
let mqlListenerInitialized = false;

function initMql(force = false): void {
  if (!isClient() || (mqlListenerInitialized && !force)) return;
  mqlListenerInitialized = true;
  try {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    osReduced.value = mql.matches;
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", (e: MediaQueryListEvent) => {
        osReduced.value = e.matches;
      });
    }
  } catch {
    /* matchMedia unavailable */
  }
}

export function initMotion(force = false): void {
  if (!isClient()) return;
  initMql(force);
  const initial = readStoredMotion();
  setMotion(initial, { persist: false });
}

export function useReducedMotion(): {
  reduced: ComputedRef<boolean>;
  off: ComputedRef<boolean>;
} {
  if (isClient()) {
    initMql();
  }
  const off = computed(() => _motionMode.value === "off");
  const reduced = computed(() => {
    if (_motionMode.value === "off" || _motionMode.value === "reduce")
      return true;
    if (_motionMode.value === "full") return false;
    return osReduced.value;
  });

  return { reduced, off };
}
