import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, watch } from "vue";
import {
  useToast,
  useToastStore,
  type ToastEntry,
} from "../../src/composables/useToast";

/**
 * useToast is a module-scope reactive() singleton (no pinia). Because the queue
 * is process-global within this test file, every test drains it first so state
 * never bleeds across specs.
 */

function drain(): void {
  const { queue } = useToast();
  queue.splice(0, queue.length);
}

beforeEach(() => {
  drain();
});

afterEach(() => {
  drain();
  vi.restoreAllMocks();
});

describe("useToast singleton wiring", () => {
  it("useToast and useToastStore share one reactive queue reference", () => {
    const a = useToast();
    const b = useToast();
    expect(a.queue).toBe(b.queue);
    expect(a.queue).toBe(useToastStore().queue);
  });

  it("the store object is frozen", () => {
    expect(Object.isFrozen(useToastStore())).toBe(true);
  });

  it("exposes the documented members", () => {
    const t = useToast();
    expect(typeof t.show).toBe("function");
    expect(typeof t.dismiss).toBe("function");
    expect(typeof t.success).toBe("function");
    expect(typeof t.error).toBe("function");
    expect(typeof t.warning).toBe("function");
    expect(typeof t.info).toBe("function");
    expect(Array.isArray(t.queue)).toBe(true);
  });
});

describe("useToast show() signatures", () => {
  it("show(message) pushes one entry with framework defaults", () => {
    const { show, queue } = useToast();
    const id = show("Hello");
    expect(queue).toHaveLength(1);
    const entry = queue[0];
    expect(entry.id).toBe(id);
    expect(entry.message).toBe("Hello");
    expect(entry.duration).toBe(5000);
    expect(entry.position).toBe("top-right");
    expect(entry.dismissible).toBe(true);
    expect(entry.showProgress).toBe(true);
    expect(entry.solid).toBe(false);
    expect(entry.type).toBeUndefined();
  });

  it("show(message, type, duration) applies the positional args", () => {
    const { show, queue } = useToast();
    show("Saved", "success", 3000);
    const entry = queue[0];
    expect(entry.type).toBe("success");
    expect(entry.duration).toBe(3000);
    expect(entry.message).toBe("Saved");
  });

  it("show(message, options) merges the options object and keeps the message", () => {
    const { show, queue } = useToast();
    show("Heads up", {
      title: "Notice",
      position: "bottom-center",
      dismissible: false,
      solid: true,
    });
    const entry = queue[0];
    expect(entry.message).toBe("Heads up");
    expect(entry.title).toBe("Notice");
    expect(entry.position).toBe("bottom-center");
    expect(entry.dismissible).toBe(false);
    expect(entry.solid).toBe(true);
  });

  it("show(optionsObject) reads message/type off the object", () => {
    const { show, queue } = useToast();
    show({ message: "Object form", type: "warning", showProgress: false });
    const entry = queue[0];
    expect(entry.message).toBe("Object form");
    expect(entry.type).toBe("warning");
    expect(entry.showProgress).toBe(false);
  });

  it("defaults message to empty string when none supplied", () => {
    const { show, queue } = useToast();
    show({ type: "info" });
    expect(queue[0].message).toBe("");
  });

  it("returns a unique non-empty id per call", () => {
    const { show } = useToast();
    const id1 = show("a");
    const id2 = show("b");
    expect(id1).toMatch(/^toast-/);
    expect(id2).toMatch(/^toast-/);
    expect(id1).not.toBe(id2);
  });
});

describe("useToast typed helpers", () => {
  it.each([
    ["success", (m: string) => useToast().success(m)],
    ["error", (m: string) => useToast().error(m)],
    ["warning", (m: string) => useToast().warning(m)],
    ["info", (m: string) => useToast().info(m)],
  ] as const)("%s(message) pushes an entry with that type", (type, call) => {
    const { queue } = useToast();
    call("hi");
    expect(queue[0].type).toBe(type);
    expect(queue[0].message).toBe("hi");
  });

  it("helper options are forwarded, but the type is forced", () => {
    const { success, queue } = useToast();
    success("Done", { duration: 100, position: "top-left" });
    const entry = queue[0];
    expect(entry.type).toBe("success");
    expect(entry.duration).toBe(100);
    expect(entry.position).toBe("top-left");
  });
});

describe("useToast dismiss", () => {
  it("removes the matching entry by id and leaves the rest", () => {
    const { show, dismiss, queue } = useToast();
    const a = show("a");
    const b = show("b");
    const c = show("c");
    expect(queue).toHaveLength(3);

    dismiss(b);
    expect(queue).toHaveLength(2);
    expect(queue.map((t: ToastEntry) => t.id)).toEqual([a, c]);
  });

  it("is a no-op for an unknown id", () => {
    const { show, dismiss, queue } = useToast();
    show("only");
    dismiss("toast-does-not-exist");
    expect(queue).toHaveLength(1);
  });
});

describe("useToast reactivity", () => {
  it("the queue is reactive: watchers fire on push and dismiss", async () => {
    const { show, dismiss, queue } = useToast();
    const spy = vi.fn();
    const stop = watch(() => queue.length, spy);

    const id = show("reactive");
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe(1);

    dismiss(id);
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1][0]).toBe(0);

    stop();
  });
});
