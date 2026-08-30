import { describe, expectTypeOf, it } from "vitest";
import type {
  GlobalSearchAdapter,
  GlobalSearchHit,
  GlobalSearchShortcutOptions,
  UseGlobalSearchController,
} from "../../src/composables/useGlobalSearch";

describe("global search API types", () => {
  it("locks public adapter and controller shapes", () => {
    expectTypeOf<GlobalSearchHit>().toMatchTypeOf<{
      id: string;
      title: string;
      route: string;
    }>();
    expectTypeOf<GlobalSearchAdapter>().toHaveProperty("search");
    expectTypeOf<UseGlobalSearchController>().toHaveProperty("open");
    expectTypeOf<GlobalSearchShortcutOptions>().toEqualTypeOf<
      boolean | { key?: string; slash?: boolean }
    >();
  });
});
