import { afterEach, describe, expect, it, vi } from "vitest";
import { sanitizeHtml } from "../../src/utils/sanitizeHtml";

/**
 * `sanitizeHtml` is the library's only XSS guard and a public export, yet had
 * no direct coverage. These specs pin its whitelist behaviour: unknown tags
 * flatten to text, only http/https/mailto survive on `<a href>`, event-handler
 * attributes are dropped, SVG is kept only under `allowSvg` (with a
 * case-insensitive tag/attr allowlist), `allowStyle` is a permit with a minimal
 * blocklist scrub, and a DOMParser-less (SSR) environment fails closed to
 * escaped text.
 */

/** Re-parse sanitized output so we can query it as real DOM. */
const parse = (html: string): HTMLDivElement => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sanitizeHtml — tag whitelist", () => {
  it("flattens <script> to text and keeps allowed inline tags", () => {
    const out = sanitizeHtml("<b>hi</b><script>alert(1)</script>");
    expect(out).toContain("<b>hi</b>");
    expect(out.toLowerCase()).not.toContain("<script");
    // The script's text content survives as inert text.
    expect(parse(out).textContent).toBe("hialert(1)");
  });

  it("drops an <img onerror> entirely (not an allowed tag)", () => {
    const out = sanitizeHtml('<img src="x" onerror="steal()">after');
    const div = parse(out);
    expect(div.querySelector("img")).toBeNull();
    expect(out.toLowerCase()).not.toContain("onerror");
    expect(div.textContent).toBe("after");
  });
});

describe("sanitizeHtml — href protocol filtering", () => {
  it("keeps http/https/mailto hrefs", () => {
    const https = parse(sanitizeHtml('<a href="https://ex.com/x">l</a>'));
    expect(https.querySelector("a")?.getAttribute("href")).toBe(
      "https://ex.com/x",
    );
    const mail = parse(sanitizeHtml('<a href="mailto:a@b.com">m</a>'));
    expect(mail.querySelector("a")?.getAttribute("href")).toBe(
      "mailto:a@b.com",
    );
  });

  it("strips javascript:, data:, and mixed-case JaVaScRiPt: hrefs (tag kept, href gone)", () => {
    for (const href of [
      "javascript:alert(1)",
      "data:text/html,<x>",
      "JaVaScRiPt:alert(1)",
    ]) {
      const a = parse(
        sanitizeHtml(`<a href="${href}">click</a>`),
      ).querySelector("a");
      expect(a).not.toBeNull();
      expect(a?.hasAttribute("href")).toBe(false);
      expect(a?.textContent).toBe("click");
    }
  });

  it("removes target and rel from anchors", () => {
    const a = parse(
      sanitizeHtml(
        '<a href="https://ex.com" target="_blank" rel="opener">l</a>',
      ),
    ).querySelector("a");
    expect(a?.hasAttribute("target")).toBe(false);
    expect(a?.hasAttribute("rel")).toBe(false);
  });
});

describe("sanitizeHtml — event handlers", () => {
  it("strips onclick/onload and other on* attributes from kept elements", () => {
    const out = sanitizeHtml('<span onclick="a()" onload="b()">t</span>');
    const span = parse(out).querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.hasAttribute("onclick")).toBe(false);
    expect(span?.hasAttribute("onload")).toBe(false);
    expect(out.toLowerCase()).not.toContain("onclick");
  });
});

describe("sanitizeHtml — SVG (allowSvg)", () => {
  const svg =
    '<svg viewBox="0 0 10 10" onload="hack()">' +
    '<circle cx="5" cy="5" r="4" onclick="x()"></circle>' +
    '<path d="M0 0 L10 10"></path>' +
    "<foreignObject><div>hi</div></foreignObject>" +
    "</svg>";

  it("with allowSvg:true keeps <circle>/<path> and safe attrs (d, viewBox) but drops onload/onclick and <foreignObject>", () => {
    const out = sanitizeHtml(svg, { allowSvg: true });
    const div = parse(out);

    // The SVG element survives (this is the case-insensitive-allowlist fix).
    expect(div.querySelector("svg")).not.toBeNull();
    expect(div.querySelector("circle")).not.toBeNull();
    expect(div.querySelector("path")?.getAttribute("d")).toBe("M0 0 L10 10");
    // viewBox is preserved (matched case-insensitively).
    const vb = div.querySelector("svg")?.getAttribute("viewBox");
    expect(vb).toBe("0 0 10 10");
    // Event handlers and foreignObject are gone.
    expect(out.toLowerCase()).not.toContain("onload");
    expect(out.toLowerCase()).not.toContain("onclick");
    expect(out.toLowerCase()).not.toContain("foreignobject");
  });

  it("without allowSvg the whole SVG is flattened to text (no <circle> survives)", () => {
    const div = parse(sanitizeHtml(svg));
    expect(div.querySelector("svg")).toBeNull();
    expect(div.querySelector("circle")).toBeNull();
  });
});

describe("sanitizeHtml — allowStyle", () => {
  it("drops the style attribute by default", () => {
    const div = parse(sanitizeHtml('<div style="color:red">x</div>'));
    expect(div.querySelector("div")?.hasAttribute("style")).toBe(false);
  });

  it("keeps a safe style value when allowStyle:true", () => {
    const div = parse(
      sanitizeHtml('<div style="color:red">x</div>', { allowStyle: true }),
    );
    expect(div.querySelector("div")?.getAttribute("style")).toBe("color:red");
  });

  it("scrubs a dangerous style value even when allowStyle:true (url()/position:fixed)", () => {
    const url = parse(
      sanitizeHtml('<div style="background:url(javascript:alert(1))">x</div>', {
        allowStyle: true,
      }),
    );
    expect(url.querySelector("div")?.hasAttribute("style")).toBe(false);

    const fixed = parse(
      sanitizeHtml('<div style="position:fixed;top:0;left:0">x</div>', {
        allowStyle: true,
      }),
    );
    expect(fixed.querySelector("div")?.hasAttribute("style")).toBe(false);
  });

  it("scrubs escape-obfuscated styles (any backslash) under allowStyle:true", () => {
    // `\28`/`\29` are CSS escapes for `(`/`)`, so `url\28 …\29` decodes to `url(…)`.
    // Any backslash is treated as unsafe, closing the escape-obfuscation class.
    const escaped = parse(
      sanitizeHtml(
        '<div style="background:url\\28 javascript:alert(1)\\29">x</div>',
        { allowStyle: true },
      ),
    );
    expect(escaped.querySelector("div")?.hasAttribute("style")).toBe(false);
  });
});

describe("sanitizeHtml — SSR / no DOMParser", () => {
  it("fails closed to escaped text when DOMParser is undefined", () => {
    vi.stubGlobal("DOMParser", undefined);
    const out = sanitizeHtml('<b>hi</b><img src="x" onerror="a()">');
    // Everything is escaped — no live markup is produced.
    expect(out).toContain("&lt;b&gt;");
    expect(out).toContain("&lt;img");
    expect(out).not.toContain("<b>");
    expect(out).not.toContain("<img");
  });

  it("returns an empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });
});
