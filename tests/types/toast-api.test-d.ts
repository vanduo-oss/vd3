/**
 * useToast public-API type lock — committed BEFORE the pinia-free rewrite
 * (vd3-carryover, task 3.1) so the module-singleton implementation cannot
 * drift from the old @vanduo-oss/vue pinia store's documented surface.
 *
 * Pins: the exported names (`useToast`, `useToastStore`, `ToastType`,
 * `ToastPosition`, `ToastEntry`, `ToastOptions`), the flexible `show()`
 * signature (all four call shapes -> `string` id), `dismiss(id)`, the four
 * typed helpers, and the reactive `queue` member set
 * `{ queue, show, dismiss, success, error, warning, info }`.
 */
import { describe, expectTypeOf, it } from "vitest";
import {
  useToast,
  useToastStore,
  type ToastEntry,
  type ToastOptions,
  type ToastPosition,
  type ToastType,
} from "../../src/composables/useToast";

describe("useToast public API (type lock)", () => {
  it("locks the ToastType and ToastPosition unions", () => {
    expectTypeOf<ToastType>().toEqualTypeOf<
      "success" | "error" | "warning" | "info"
    >();
    expectTypeOf<ToastPosition>().toEqualTypeOf<
      | "top-right"
      | "top-left"
      | "top-center"
      | "bottom-right"
      | "bottom-left"
      | "bottom-center"
    >();
  });

  it("locks the ToastEntry shape", () => {
    expectTypeOf<ToastEntry>().toEqualTypeOf<{
      id: string;
      message: string;
      title?: string;
      type?: ToastType;
      duration: number;
      position: ToastPosition;
      dismissible: boolean;
      showProgress: boolean;
      solid: boolean;
    }>();
  });

  it("locks the ToastOptions shape (everything optional)", () => {
    expectTypeOf<ToastOptions>().toEqualTypeOf<{
      message?: string;
      title?: string;
      type?: ToastType;
      duration?: number;
      position?: ToastPosition;
      dismissible?: boolean;
      showProgress?: boolean;
      solid?: boolean;
    }>();
  });

  it("locks the useToast() member set", () => {
    expectTypeOf(useToast).parameters.toEqualTypeOf<[]>();
    expectTypeOf(useToast).returns.toEqualTypeOf<{
      show: (
        options: ToastOptions | string,
        type?: ToastType | ToastOptions,
        duration?: number,
      ) => string;
      dismiss: (id: string) => void;
      success: (message: string, opts?: ToastOptions) => string;
      error: (message: string, opts?: ToastOptions) => string;
      warning: (message: string, opts?: ToastOptions) => string;
      info: (message: string, opts?: ToastOptions) => string;
      queue: ToastEntry[];
    }>();
  });

  it("locks the useToastStore() singleton member set", () => {
    expectTypeOf(useToastStore).parameters.toEqualTypeOf<[]>();
    expectTypeOf(useToastStore).returns.toEqualTypeOf<{
      queue: ToastEntry[];
      show: (
        options: ToastOptions | string,
        type?: ToastType | ToastOptions,
        duration?: number,
      ) => string;
      dismiss: (id: string) => void;
      success: (message: string, opts?: ToastOptions) => string;
      error: (message: string, opts?: ToastOptions) => string;
      warning: (message: string, opts?: ToastOptions) => string;
      info: (message: string, opts?: ToastOptions) => string;
    }>();
  });

  it("locks the flexible show() call shapes, each returning the entry id", () => {
    const { show, dismiss, success, error, warning, info } = useToast();

    // show('msg')
    expectTypeOf(show).toBeCallableWith("saved");
    // show('msg', 'success', 3000)
    expectTypeOf(show).toBeCallableWith("saved", "success", 3000);
    // show('msg', { ... })
    expectTypeOf(show).toBeCallableWith("saved", {
      position: "bottom-center",
    });
    // show({ message, ... })
    expectTypeOf(show).toBeCallableWith({
      message: "hi",
      type: "info",
      duration: 1000,
    });
    expectTypeOf(show).returns.toEqualTypeOf<string>();

    // dismiss(id) -> void
    expectTypeOf(dismiss).toBeCallableWith("toast-1");
    expectTypeOf(dismiss).returns.toEqualTypeOf<void>();

    // the four typed helpers: (message, opts?) -> string
    for (const helper of [success, error, warning, info]) {
      expectTypeOf(helper).toBeCallableWith("msg");
      expectTypeOf(helper).toBeCallableWith("msg", { duration: 1 });
      expectTypeOf(helper).returns.toEqualTypeOf<string>();
    }
  });

  it("locks the reactive queue as a plain ToastEntry array", () => {
    expectTypeOf(useToast()).toHaveProperty("queue");
    expectTypeOf(useToast().queue).toEqualTypeOf<ToastEntry[]>();
    expectTypeOf(useToastStore().queue).toEqualTypeOf<ToastEntry[]>();
  });
});
