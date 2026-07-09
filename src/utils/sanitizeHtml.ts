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
 */
export interface SanitizeOptions {
  allowSvg?: boolean;
  /** Permit the inline `style` attribute on kept elements. Default: false. */
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
const SAFE_SVG_ATTRS = new Set([
  "xmlns",
  "width",
  "height",
  "viewBox",
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

      if (!allowed.includes(el.nodeName)) {
        node.replaceChild(document.createTextNode(el.textContent ?? ""), child);
        return;
      }

      if (el.nodeName === "A") {
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
      } else if (allowSvg && (el.nodeName === "SVG" || el.closest?.("svg"))) {
        Array.from(el.attributes).forEach((a) => {
          if (!SAFE_SVG_ATTRS.has(a.name)) el.removeAttribute(a.name);
        });
      } else {
        const safe = new Set(["class"]);
        if (allowStyle) safe.add("style");
        Array.from(el.attributes).forEach((a) => {
          if (!safe.has(a.name)) el.removeAttribute(a.name);
        });
      }

      sanitizeNode(el);
    });
  };

  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}
