import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLiquidGradient,
  mixRgb,
  parseCssColor,
  parseRgbTriplet,
} from "../../src/effects/createLiquidGradient";

describe("liquid gradient color helpers", () => {
  it("parseRgbTriplet normalizes 0–255 channels", () => {
    expect(parseRgbTriplet("51, 102, 255")).toEqual([
      51 / 255,
      102 / 255,
      255 / 255,
    ]);
    expect(parseRgbTriplet("")).toBeNull();
    expect(parseRgbTriplet("1, 2")).toBeNull();
  });

  it("parseCssColor handles hex and rgb()", () => {
    expect(parseCssColor("#3366ff")).toEqual([
      0x33 / 255,
      0x66 / 255,
      0xff / 255,
    ]);
    expect(parseCssColor("#abc")).toEqual([0xaa / 255, 0xbb / 255, 0xcc / 255]);
    expect(parseCssColor("rgb(10, 20, 30)")).toEqual([
      10 / 255,
      20 / 255,
      30 / 255,
    ]);
    expect(parseCssColor("not-a-color")).toBeNull();
  });

  it("mixRgb interpolates channels", () => {
    expect(mixRgb([0, 0, 0], [1, 1, 1], 0.5)).toEqual([0.5, 0.5, 0.5]);
  });
});

describe("createLiquidGradient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when WebGL is unavailable", () => {
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(null);
    expect(createLiquidGradient(canvas)).toBeNull();
  });

  it("returns null when the 2d touch canvas cannot be created", () => {
    const canvas = document.createElement("canvas");
    const fakeGl = { noop: true } as unknown as WebGLRenderingContext;
    vi.spyOn(canvas, "getContext").mockReturnValue(fakeGl);
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      const el = realCreate(tag);
      if (tag === "canvas") {
        (el as HTMLCanvasElement).getContext = () => null;
      }
      return el;
    }) as typeof document.createElement);
    expect(createLiquidGradient(canvas)).toBeNull();
  });
});
