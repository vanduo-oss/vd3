import { describe, expectTypeOf, it } from "vitest";
import type {
  DockGlass,
  DockItemLayout,
  DockOrientation,
  DockPlacement,
  DockRadius,
  DockTint,
  DockVisualPhase,
} from "../../src/composables/useDockOrientation";

describe("dock public API (type lock)", () => {
  it("locks orientation and phase", () => {
    expectTypeOf<DockOrientation>().toEqualTypeOf<"horizontal" | "vertical">();
    expectTypeOf<DockVisualPhase>().toEqualTypeOf<
      "horizontal" | "square" | "vertical"
    >();
    expectTypeOf<DockItemLayout>().toEqualTypeOf<"stack" | "inline">();
    expectTypeOf<DockPlacement>().toEqualTypeOf<
      "bottom" | "top" | "left" | "right"
    >();
  });

  it("locks tint, glass, and dock-own radius", () => {
    expectTypeOf<DockTint>().toEqualTypeOf<
      | "red"
      | "orange"
      | "yellow"
      | "green"
      | "teal"
      | "blue"
      | "violet"
      | "pink"
    >();
    expectTypeOf<DockGlass>().toEqualTypeOf<1 | 2 | 3 | 5 | 8 | 13 | 21 | 34>();
    expectTypeOf<DockRadius>().toEqualTypeOf<
      "0.5" | "0.75" | "1" | "1.25" | "1.5" | "2" | "9999"
    >();
  });
});
