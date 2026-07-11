import { onMounted, onUnmounted, reactive, type Ref } from "vue";

/** A rule validator: receives the field value and the (possibly empty) rule parameter. */
export type ValidateRule = (value: string, param: string) => boolean;

/** Validation trigger modes, mirroring `data-vd-validate-mode`. */
export type ValidateMode = "blur" | "input" | "submit";

export interface UseValidateOptions {
  /**
   * vd3 extension: fallback mode used when a form carries no
   * `data-vd-validate-mode` attribute. The attribute still wins, as do
   * per-field `data-vd-validate-mode` overrides. Default: `"blur"`.
   */
  mode?: ValidateMode;
  /**
   * vd3 extension: extra rule validators merged over the built-in table
   * (same shape as `VanduoValidate.addRule`), usable from `data-vd-rules`.
   */
  rules?: Record<string, ValidateRule>;
  /**
   * vd3 extension: default messages merged over the built-in catalog
   * (`{0}` is substituted with the rule parameter).
   */
  messages?: Record<string, string>;
}

export interface UseValidateReturn {
  /**
   * Validate every wired form now (vanilla `VanduoValidate.validateForm`
   * across the root). Returns `true` when all fields pass.
   */
  validate(): boolean;
  /**
   * Register (or override) a rule for this instance — mirrors
   * `VanduoValidate.addRule(name, validator, message)`.
   */
  addRule(name: string, validator: ValidateRule, message?: string): void;
  /**
   * vd3 extension: clear all validation state — removes `is-valid` /
   * `is-invalid` and `aria-invalid`, hides `.vd-validate-error` elements,
   * and empties the reactive `errors` map.
   */
  reset(): void;
  /**
   * vd3 extension: reactive map of the first error message per failing
   * field, keyed by the field's `name`, falling back to `id`, then to a
   * generated `field-<n>` key. Entries are removed as fields turn valid.
   */
  errors: Record<string, string>;
  /**
   * vd3 extension: re-scan the root and wire `[data-vd-validate]` /
   * `.vd-validate` forms added after mount. Idempotent.
   */
  refresh(): void;
}

/** Field elements carrying `data-vd-rules` (inputs, textareas, selects). */
type FieldEl = HTMLInputElement;

/** Rule validators — ported verbatim from `framework/js/components/validate.js`. */
const builtinRules: Record<string, ValidateRule> = {
  required: (value) => value.trim().length > 0,
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  number: (value) => !isNaN(parseFloat(value)) && isFinite(Number(value)),
  min: (value, param) => value.length >= parseInt(param, 10),
  max: (value, param) => value.length <= parseInt(param, 10),
  minVal: (value, param) => parseFloat(value) >= parseFloat(param),
  maxVal: (value, param) => parseFloat(value) <= parseFloat(param),
  pattern: (value, param) => {
    try {
      // Cap regex length to prevent ReDoS from excessively complex patterns.
      if (param.length > 100) return false;
      return new RegExp(param).test(value);
    } catch {
      return false;
    }
  },
  // Vanilla resolves the other field by [name] only; the shim documented an
  // extension resolving by element id first (the docs demo uses ids). Kept.
  match: (value, param) => {
    try {
      const escaped =
        typeof CSS !== "undefined" && CSS.escape ? CSS.escape(param) : param;
      const other =
        document.getElementById(param) ??
        document.querySelector<HTMLInputElement>(`[name="${escaped}"]`);
      return other ? value === (other as HTMLInputElement).value : false;
    } catch {
      return false;
    }
  },
};

/** Message catalog — ported verbatim from `framework/js/components/validate.js`. */
const builtinMessages: Record<string, string> = {
  required: "This field is required",
  email: "Please enter a valid email address",
  url: "Please enter a valid URL",
  number: "Please enter a valid number",
  min: "Minimum {0} characters required",
  max: "Maximum {0} characters allowed",
  minVal: "Value must be at least {0}",
  maxVal: "Value must be at most {0}",
  pattern: "Invalid format",
  match: "Fields do not match",
};

/**
 * Reproduces `framework/js/components/validate.js` in Vue: scans `root`
 * (including the root element itself, matching the vanilla `queryAll`) for
 * `[data-vd-validate]` / `.vd-validate` forms and wires declarative
 * validation — pipe-separated rules on `data-vd-rules` with `:`-joined
 * params (first failing rule wins), custom `data-vd-msg-<rule>` messages
 * with `{0}` substitution, modes `blur` (default) / `input` / `submit` from
 * `data-vd-validate-mode` with the documented per-field override (blur mode
 * revalidates on input once a field is marked), field state via `is-valid` /
 * `is-invalid` + `aria-invalid`, a generated `.vd-validate-error`
 * (`role="alert"`, linked by `aria-describedby`), and a submit gate that
 * validates all fields, focuses the first invalid one, prevents submission
 * when invalid, and always dispatches `validate:submit` with `{ valid }`.
 *
 * Field listeners are delegated to the form (`focusout`/`input`), so fields
 * added or re-rendered by Vue after mount are validated without re-wiring.
 * The returned controller and the `options` argument are optional vd3
 * extensions — `useValidate(root)` behaves exactly like the old shim.
 */
export function useValidate(
  root: Ref<HTMLElement | null>,
  options?: UseValidateOptions,
): UseValidateReturn {
  const rules: Record<string, ValidateRule> = {
    ...builtinRules,
    ...options?.rules,
  };
  const messages: Record<string, string> = {
    ...builtinMessages,
    ...options?.messages,
  };

  const errors = reactive<Record<string, string>>({});
  const wired = new Set<HTMLFormElement>();
  const created: HTMLElement[] = [];
  const cleanups: Array<() => void> = [];
  const fieldKeys = new WeakMap<Element, string>();
  let anonSeq = 0;

  const keyFor = (field: FieldEl): string => {
    const explicit = field.getAttribute("name") || field.id;
    if (explicit) return explicit;
    let key = fieldKeys.get(field);
    if (!key) {
      anonSeq += 1;
      key = `field-${anonSeq}`;
      fieldKeys.set(field, key);
    }
    return key;
  };

  const setFieldState = (field: FieldEl, fieldErrors: string[]): void => {
    const wrapper = field.closest(".vd-form-group") ?? field.parentElement;
    if (!wrapper) return;
    let errorEl = wrapper.querySelector<HTMLElement>(".vd-validate-error");

    field.classList.remove("is-valid", "is-invalid");

    if (fieldErrors.length > 0) {
      field.classList.add("is-invalid");
      field.setAttribute("aria-invalid", "true");
      if (!errorEl) {
        errorEl = document.createElement("div");
        errorEl.className = "vd-validate-error";
        errorEl.id = "vd-err-" + Math.random().toString(36).slice(2, 9);
        errorEl.setAttribute("role", "alert");
        wrapper.appendChild(errorEl);
        created.push(errorEl);
      }
      errorEl.textContent = fieldErrors[0] ?? "";
      errorEl.style.display = "";
      field.setAttribute("aria-describedby", errorEl.id);
    } else if (field.value.trim()) {
      field.classList.add("is-valid");
      field.removeAttribute("aria-invalid");
      if (errorEl) errorEl.style.display = "none";
    } else {
      field.removeAttribute("aria-invalid");
      if (errorEl) errorEl.style.display = "none";
    }

    const key = keyFor(field);
    const first = fieldErrors[0];
    if (first !== undefined) errors[key] = first;
    else delete errors[key];
  };

  const validateField = (field: FieldEl): boolean => {
    const rulesStr = field.getAttribute("data-vd-rules") ?? "";
    const fieldRules = rulesStr
      .split("|")
      .map((r) => r.trim())
      .filter(Boolean);
    const value = field.value;
    const fieldErrors: string[] = [];

    for (const rule of fieldRules) {
      const [name, ...params] = rule.split(":");
      const param = params.join(":");
      const validator = name ? rules[name] : undefined;

      if (validator && !validator(value, param)) {
        const customMsg = name
          ? field.getAttribute(`data-vd-msg-${name}`)
          : null;
        let msg = customMsg ?? (name ? messages[name] : undefined) ?? "Invalid";
        if (param) msg = msg.replace("{0}", param);
        fieldErrors.push(msg);
        break; // one error at a time
      }
    }

    setFieldState(field, fieldErrors);
    return fieldErrors.length === 0;
  };

  const fieldsOf = (form: HTMLFormElement): FieldEl[] =>
    Array.from(form.querySelectorAll<FieldEl>("[data-vd-rules]"));

  const validateForm = (form: HTMLFormElement): boolean => {
    let valid = true;
    fieldsOf(form).forEach((field) => {
      if (!validateField(field)) valid = false;
    });
    return valid;
  };

  const fieldFrom = (target: EventTarget | null): FieldEl | null =>
    target instanceof HTMLElement && target.hasAttribute("data-vd-rules")
      ? (target as FieldEl)
      : null;

  const wireForm = (form: HTMLFormElement): void => {
    if (wired.has(form)) return;
    wired.add(form);

    const formMode =
      form.getAttribute("data-vd-validate-mode") ?? options?.mode ?? "blur";
    const modeFor = (field: FieldEl): string =>
      field.getAttribute("data-vd-validate-mode") ?? formMode;

    // blur mode: validate the field when focus leaves it (focusout bubbles,
    // unlike blur, so a single delegated listener covers dynamic fields).
    const onFocusOut = (e: Event): void => {
      const field = fieldFrom(e.target);
      if (field && modeFor(field) === "blur") validateField(field);
    };

    // input mode validates on every keystroke; blur mode revalidates on
    // input only once the field has already been marked (vanilla inputClear).
    const onInput = (e: Event): void => {
      const field = fieldFrom(e.target);
      if (!field) return;
      const mode = modeFor(field);
      if (mode === "input") {
        validateField(field);
      } else if (
        mode === "blur" &&
        (field.classList.contains("is-invalid") ||
          field.classList.contains("is-valid"))
      ) {
        validateField(field);
      }
    };

    const onSubmit = (e: Event): void => {
      const valid = validateForm(form);
      if (!valid) {
        e.preventDefault();
        e.stopPropagation();
        form.querySelector<HTMLElement>(".is-invalid")?.focus();
      }
      form.dispatchEvent(
        new CustomEvent("validate:submit", {
          detail: { valid },
          bubbles: true,
        }),
      );
    };

    form.addEventListener("focusout", onFocusOut);
    form.addEventListener("input", onInput);
    form.addEventListener("submit", onSubmit);
    cleanups.push(() => {
      form.removeEventListener("focusout", onFocusOut);
      form.removeEventListener("input", onInput);
      form.removeEventListener("submit", onSubmit);
    });
  };

  const refresh = (): void => {
    const host = root.value;
    if (!host) return;
    const selector = "[data-vd-validate], .vd-validate";
    // Vanilla queryAll includes the root itself when it matches.
    if (host.matches(selector)) wireForm(host as HTMLFormElement);
    host
      .querySelectorAll<HTMLFormElement>(selector)
      .forEach((form) => wireForm(form));
  };

  const validate = (): boolean => {
    let valid = true;
    wired.forEach((form) => {
      if (!validateForm(form)) valid = false;
    });
    return valid;
  };

  const addRule = (
    name: string,
    validator: ValidateRule,
    message?: string,
  ): void => {
    rules[name] = validator;
    if (message) messages[name] = message;
  };

  const reset = (): void => {
    wired.forEach((form) => {
      fieldsOf(form).forEach((field) => {
        field.classList.remove("is-valid", "is-invalid");
        field.removeAttribute("aria-invalid");
        const wrapper = field.closest(".vd-form-group") ?? field.parentElement;
        const errorEl =
          wrapper?.querySelector<HTMLElement>(".vd-validate-error");
        if (errorEl) {
          errorEl.style.display = "none";
          if (field.getAttribute("aria-describedby") === errorEl.id) {
            field.removeAttribute("aria-describedby");
          }
        }
      });
    });
    Object.keys(errors).forEach((key) => delete errors[key]);
  };

  onMounted(refresh);

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    // Remove exactly this instance's generated DOM and state marks.
    wired.forEach((form) => {
      fieldsOf(form).forEach((field) => {
        field.classList.remove("is-valid", "is-invalid");
        field.removeAttribute("aria-invalid");
        const describedBy = field.getAttribute("aria-describedby");
        if (
          describedBy &&
          created.some((errorEl) => errorEl.id === describedBy)
        ) {
          field.removeAttribute("aria-describedby");
        }
      });
    });
    created.forEach((errorEl) => errorEl.remove());
    created.length = 0;
    wired.clear();
  });

  return { validate, addRule, reset, errors, refresh };
}
