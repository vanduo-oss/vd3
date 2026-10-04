import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();
describe("effective lint coverage", () => {
  it.each([
    "src/utils/sanitizeHtml.ts",
    "src/composables/usePopover.ts",
    "src/components/VdButton.vue",
  ])("includes %s", async (file) => {
    expect(await eslint.isPathIgnored(file)).toBe(false);
    expect(await eslint.calculateConfigForFile(file)).toBeDefined();
  });
  it("rejects unsanitized dynamic HTML in production TypeScript", async () => {
    const [result] = await eslint.lintText(
      "export function render(el: HTMLElement, html: string) { el.innerHTML = html; }",
      { filePath: "src/lint-probe.ts" },
    );
    expect(
      result.messages.some(
        (message) =>
          message.ruleId === "no-restricted-syntax" && message.severity === 2,
      ),
    ).toBe(true);
  });
});
