import { describe, expect, it } from "vitest";
import { highlight, highlightCode } from "../src/highlight";

describe("highlightCode", () => {
  it("highlights html tags and attributes", () => {
    const html = highlightCode('<div class="x">hi</div>', "html");
    expect(html).toContain("vd-tk-tag");
    expect(html).toContain("vd-tk-attribute");
    expect(html).not.toContain("hljs-");
    expect(html).toContain("div");
  });

  it("highlights css properties and punctuation", () => {
    const html = highlightCode(".x { color: red; }", "css");
    expect(html).toMatch(/vd-tk-/);
    expect(html).toContain("vd-tk-property");
  });

  it("treats js as JS + light TS (keywords)", () => {
    const html = highlightCode("const x: string = 1;", "js");
    expect(html).toContain("vd-tk-keyword");
    expect(html).toContain("const");
    expect(html).toContain("vd-tk-number");
  });

  it("highlights shell builtins and json properties", () => {
    expect(highlightCode("echo hi", "shell")).toMatch(/vd-tk-/);
    expect(highlightCode("echo hi", "shell")).toContain("vd-tk-builtin");
    const json = highlightCode('{"a":1}', "json");
    expect(json).toMatch(/vd-tk-/);
    expect(json).toContain("vd-tk-property");
  });

  it("highlights vue SFC script + template tags", () => {
    const html = highlightCode(
      `<script setup lang="ts">
const n = 1;
</script>
<template>
  <VdDock tint="green" />
</template>`,
      "vue",
    );
    expect(html).toContain("vd-tk-tag");
    expect(html).toContain("script");
    expect(html).toContain("VdDock");
    expect(html).toContain("vd-tk-keyword");
  });

  it("escapes unknown languages as plaintext", () => {
    const html = highlightCode("<b>x & y</b>", "unknown");
    expect(html).toBe("&lt;b&gt;x &amp; y&lt;/b&gt;");
    expect(html).not.toContain("vd-tk-");
  });

  it("does not append an extra trailing newline", () => {
    expect(highlightCode("const x = 1;", "js").endsWith("\n")).toBe(false);
    const withNl = highlightCode("const x = 1;\n", "js");
    expect(withNl.endsWith("\n")).toBe(true);
    expect(withNl.endsWith("\n\n")).toBe(false);
  });

  it("exports highlight as an alias of highlightCode", () => {
    expect(highlight).toBe(highlightCode);
    expect(highlight("true", "json")).toContain("vd-tk-boolean");
  });
});
