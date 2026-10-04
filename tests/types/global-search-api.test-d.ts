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
    expectTypeOf<GlobalSearchAdapter["search"]>().toEqualTypeOf<
      (query: string, ctx: { ai: boolean }) => Promise<GlobalSearchHit[]>
    >();
    expectTypeOf<UseGlobalSearchController["open"]>().toEqualTypeOf<
      () => void
    >();
    expectTypeOf<GlobalSearchShortcutOptions>().toEqualTypeOf<
      boolean | { key?: string; slash?: boolean }
    >();
  });
});
