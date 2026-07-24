/**
 * Whitelist HTML sanitizer — dependency-free TS port of the framework's
 * `helpers.js` sanitizeHtml. Used wherever vd2 must mirror the framework's
 * raw-HTML behaviour (e.g. `data-tooltip-html`) without inheriting an XSS sink.
 *
 * Keeps a small set of inline tags, drops everything else to text, and only
 * permits http/https/mailto on `<a href>`. Event-handler attributes and unknown
 * attributes are removed. For stronger guarantees prefer DOMPurify / server-side
 * sanitization; this is a client-side guard.
 *
 * Differs from the framework on one intentional point: `style` is DENIED by
 * default here (the framework defaults it on). Opt in with `allowStyle: true`.
 *
 * `allowStyle` is NOT a full CSS sanitizer: when enabled it only applies a
 * minimal blocklist scrub (dropping the whole `style` attribute when its value
 * contains `url(`, `expression(`, or `position: fixed|sticky`) to blunt the
 * most common CSS-injection / clickjacking sinks. It is still not safe for
 * fully-untrusted HTML — internal callers all pass `allowStyle: false`.
 */
export interface SanitizeOptions {
  allowSvg?: boolean;
  /**
   * Permit the inline `style` attribute on kept elements. Default: false.
   * See the module note: this applies only a minimal blocklist scrub, not a
   * full CSS sanitizer — do not enable on untrusted HTML.
   */
  allowStyle?: boolean;
}

const BASE_ALLOWED = [
  "B",
  "STRONG",
  "I",
  "EM",
  "BR",
  "A",
  "SPAN",
  "U",
  "DIV",
  "P",
  "KBD",
  "CODE",
  "SMALL",
  "MARK",
];
const SVG_ALLOWED = ["SVG", "PATH", "LINE", "CIRCLE", "POLYLINE", "RECT", "G"];
// Stored lowercase and matched case-insensitively: an HTML-mode DOMParser
// lowercases most SVG attribute names (and camel-cases a few, e.g. `viewBox`),
// so we normalise both sides with `.toLowerCase()`.
const SAFE_SVG_ATTRS = new Set([
  "xmlns",
  "width",
  "height",
  "viewbox",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "d",
  "cx",
  "cy",
  "r",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "transform",
  "class",
]);

/**
 * Minimal, dependency-free CSS blocklist used only when `allowStyle` is on.
 * Returns true when an inline `style` value carries a common injection sink,
 * in which case the whole attribute is dropped. Not a full CSS parser.
 */
function isUnsafeStyle(value: string | null): boolean {
  if (!value) return false;
  return /url\(|expression\(|position\s*:\s*(?:fixed|sticky)/i.test(value);
}

/** Attribute-safe text escape — used as the SSR / no-DOMParser fallback. */
function escapeText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeHtml(
  input: string,
  options: SanitizeOptions = {},
): string {
  if (!input) return "";
  // SSR / non-DOM environments: fail closed to escaped text.
  if (typeof DOMParser === "undefined") return escapeText(input);

  const allowSvg = options.allowSvg === true;
  const allowStyle = options.allowStyle === true;
  const allowed = allowSvg ? BASE_ALLOWED.concat(SVG_ALLOWED) : BASE_ALLOWED;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(input, "text/html");
  } catch {
    return escapeText(input);
  }

  const sanitizeNode = (node: Node): void => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      const el = child as Element;
      // Normalise the tag name: an HTML-mode DOMParser gives SVG elements a
      // lowercase `nodeName` (e.g. `svg`, `circle`), while the allowlist is
      // uppercase — compare case-insensitively so the SVG gate actually fires.
      const name = el.nodeName.toUpperCase();

      if (!allowed.includes(name)) {
        node.replaceChild(document.createTextNode(el.textContent ?? ""), child);
        return;
      }

      if (name === "A") {
        const href = el.getAttribute("href") ?? "";
        try {
          const url = new URL(href, location.href);
          if (!["http:", "https:", "mailto:"].includes(url.protocol)) {
            el.removeAttribute("href");
          }
        } catch {
          el.removeAttribute("href");
        }
        el.removeAttribute("target");
        el.removeAttribute("rel");
      } else if (allowSvg && (name === "SVG" || el.closest?.("svg"))) {
        Array.from(el.attributes).forEach((a) => {
          if (!SAFE_SVG_ATTRS.has(a.name.toLowerCase()))
            el.removeAttribute(a.name);
        });
      } else {
        const safe = new Set(["class"]);
        if (allowStyle) safe.add("style");
        Array.from(el.attributes).forEach((a) => {
          if (!safe.has(a.name)) el.removeAttribute(a.name);
        });
        // allowStyle is a permit, not a sanitizer: drop a kept `style` value
        // that carries a common CSS-injection sink.
        if (allowStyle && isUnsafeStyle(el.getAttribute("style"))) {
          el.removeAttribute("style");
        }
      }

      sanitizeNode(el);
    });
  };

  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}
