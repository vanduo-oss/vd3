import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  setMotion,
  getMotion,
  motionMode,
  fibDurationForHeight,
  useReducedMotion,
  initMotion,
  type MotionMode,
} from "../../src/composables/useMotion";
import { setStoragePrefix } from "../../src/composables/useTheme";

describe("useMotion", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-motion");
    setStoragePrefix("vanduo-");
    setMotion("auto", { persist: false });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-motion");
    setMotion("auto", { persist: false });
  });

  describe("fibDurationForHeight", () => {
    it("returns correct adaptive duration based on Fibonacci thresholds", () => {
      expect(fibDurationForHeight(50)).toBe(144);
      expect(fibDurationForHeight(144)).toBe(144);
      expect(fibDurationForHeight(145)).toBe(233);
      expect(fibDurationForHeight(377)).toBe(233);
      expect(fibDurationForHeight(378)).toBe(377);
      expect(fibDurationForHeight(987)).toBe(377);
      expect(fibDurationForHeight(988)).toBe(610);
      expect(fibDurationForHeight(1500)).toBe(610);
    });
  });

  describe("setMotion and getMotion", () => {
    it("sets data-motion attribute and persists to localStorage", () => {
      setMotion("reduce");
      expect(getMotion()).toBe("reduce");
      expect(motionMode.value).toBe("reduce");
      expect(document.documentElement.getAttribute("data-motion")).toBe(
        "reduce",
      );
      expect(localStorage.getItem("vanduo-motion")).toBe("reduce");

      setMotion("full");
      expect(getMotion()).toBe("full");
      expect(document.documentElement.getAttribute("data-motion")).toBe("full");
      expect(localStorage.getItem("vanduo-motion")).toBe("full");

      setMotion("off");
      expect(getMotion()).toBe("off");
      expect(document.documentElement.getAttribute("data-motion")).toBe("off");
      expect(localStorage.getItem("vanduo-motion")).toBe("off");
    });

    it("removes data-motion attribute and removes storage key when set to auto", () => {
      setMotion("reduce");
      expect(document.documentElement.getAttribute("data-motion")).toBe(
        "reduce",
      );

      setMotion("auto");
      expect(getMotion()).toBe("auto");
      expect(document.documentElement.hasAttribute("data-motion")).toBe(false);
      expect(localStorage.getItem("vanduo-motion")).toBeNull();
    });

    it("respects persist: false option", () => {
      setMotion("reduce", { persist: false });
      expect(getMotion()).toBe("reduce");
      expect(document.documentElement.getAttribute("data-motion")).toBe(
        "reduce",
      );
      expect(localStorage.getItem("vanduo-motion")).toBeNull();
    });

    it("ignores invalid motion mode", () => {
      setMotion("reduce");
      setMotion("invalid" as MotionMode);
      expect(getMotion()).toBe("reduce");
    });
  });

  describe("useReducedMotion", () => {
    it("reports correct computed values for off and reduce", () => {
      const { off, reduced } = useReducedMotion();

      setMotion("off");
      expect(off.value).toBe(true);
      expect(reduced.value).toBe(true);

      setMotion("reduce");
      expect(off.value).toBe(false);
      expect(reduced.value).toBe(true);

      setMotion("full");
      expect(off.value).toBe(false);
      expect(reduced.value).toBe(false);
    });

    it("handles initMotion restoring from localStorage", () => {
      localStorage.setItem("vanduo-motion", "off");
      initMotion(true);
      expect(getMotion()).toBe("off");
      expect(document.documentElement.getAttribute("data-motion")).toBe("off");
    });

    it("handles matchMedia change listener and updates osReduced", () => {
      let listener: ((e: MediaQueryListEvent) => void) | undefined;
      const addEventListenerMock = vi
        .fn()
        .mockImplementation(
          (event: string, handler: (e: MediaQueryListEvent) => void) => {
            if (event === "change") listener = handler;
          },
        );

      const mqlMock = {
        matches: false,
        addEventListener: addEventListenerMock,
      };

      const originalMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockReturnValue(mqlMock);

      initMotion(true);

      if (listener) {
        listener({ matches: true } as MediaQueryListEvent);
        const { reduced } = useReducedMotion();
        expect(reduced.value).toBe(true);

        listener({ matches: false } as MediaQueryListEvent);
        expect(reduced.value).toBe(false);
      }

      window.matchMedia = originalMatchMedia;
    });
  });
});
