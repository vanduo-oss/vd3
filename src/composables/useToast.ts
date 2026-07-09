import { reactive } from "vue";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastPosition =
  | "top-right"
  | "top-left"
  | "top-center"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center";

export interface ToastEntry {
  id: string;
  message: string;
  title?: string;
  type?: ToastType;
  duration: number;
  position: ToastPosition;
  dismissible: boolean;
  showProgress: boolean;
  solid: boolean;
}

export interface ToastOptions {
  message?: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
  dismissible?: boolean;
  showProgress?: boolean;
  solid?: boolean;
}

/** Mirrors `Toast.defaults` in the old framework's `js/components/toast.js`. */
const DEFAULTS = {
  duration: 5000,
  position: "top-right" as ToastPosition,
  dismissible: true,
  showProgress: true,
  solid: false,
};

let counter = 0;
const nextId = (): string => {
  counter += 1;
  return `toast-${Date.now().toString(36)}-${counter}`;
};

/**
 * Module-scope singleton state (the old @vanduo-oss/vue store, de-store'd —
 * vd3 has no store library dependency). One reactive queue shared by every
 * caller in the app.
 *
 * SSR caveat: because the state lives at module scope, it is process-global —
 * under SSR every request would share the same queue (the old store was
 * per-app). Toasts are client-only interactions (the container teleports to
 * `body`), so at SSG/SSR render time this state is inert; only the client
 * ever mutates it.
 *
 * Typed as plain `ToastEntry[]` (not vue 3.5's branded `Reactive<…>`) so the
 * public surface matches the old store, which unwrapped the ref to a plain
 * reactive array.
 */
const queue: ToastEntry[] = reactive<ToastEntry[]>([]);

/**
 * Reproduces `Toast.show()` — supports the framework's flexible signature:
 * `show('msg')`, `show('msg', 'success', 3000)`, `show('msg', { … })`,
 * and `show({ message, type, … })`.
 */
const show = (
  options: ToastOptions | string,
  type?: ToastType | ToastOptions,
  duration?: number,
): string => {
  let opts: ToastOptions;
  if (typeof options === "string") {
    if (type && typeof type === "object") {
      opts = { ...type, message: options };
    } else {
      opts = {
        message: options,
        type: type as ToastType | undefined,
        duration,
      };
    }
  } else {
    opts = { ...options };
  }

  const id = nextId();
  const entry: ToastEntry = {
    id,
    message: opts.message ?? "",
    title: opts.title,
    type: opts.type,
    duration: opts.duration ?? DEFAULTS.duration,
    position: opts.position ?? DEFAULTS.position,
    dismissible: opts.dismissible ?? DEFAULTS.dismissible,
    showProgress: opts.showProgress ?? DEFAULTS.showProgress,
    solid: opts.solid ?? DEFAULTS.solid,
  };
  queue.push(entry);
  return id;
};

const dismiss = (id: string): void => {
  const index = queue.findIndex((t) => t.id === id);
  if (index !== -1) queue.splice(index, 1);
};

const success = (message: string, opts: ToastOptions = {}): string =>
  show({ ...opts, message, type: "success" });
const error = (message: string, opts: ToastOptions = {}): string =>
  show({ ...opts, message, type: "error" });
const warning = (message: string, opts: ToastOptions = {}): string =>
  show({ ...opts, message, type: "warning" });
const info = (message: string, opts: ToastOptions = {}): string =>
  show({ ...opts, message, type: "info" });

const store = {
  queue,
  show,
  dismiss,
  success,
  error,
  warning,
  info,
};
Object.freeze(store);

/**
 * The toast singleton — same documented members as the old store (`queue`,
 * `show`, `dismiss`, `success`, `error`, `warning`, `info`). BREAKING vs old
 * @vanduo-oss/vue: the store meta-API (`$patch`, `$subscribe`, `$reset`,
 * devtools integration) is gone.
 */
export const useToastStore = () => store;

export const useToast = () => {
  const store = useToastStore();
  return {
    show: store.show,
    dismiss: store.dismiss,
    success: store.success,
    error: store.error,
    warning: store.warning,
    info: store.info,
    queue: store.queue,
  };
};
