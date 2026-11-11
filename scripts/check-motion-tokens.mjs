#!/usr/bin/env node
/**
 * check-motion-tokens.mjs
 * Guard script to enforce that CSS components and effects do not introduce
 * un-tokenized literal transition durations (e.g. `0.2s`, `150ms`).
 *
 * Durations should reference `--vd-duration-*` Fibonacci tokens.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const scanDirs = ["css/components", "css/effects"];
const exemptFiles = new Set([
  // Core definitions
  "motion.css",
  "tokens.css",
]);

// Matches `transition: ... \d+ms / \d+s` or `transition-duration: ...`
// Excludes CSS vars like var(--vd-duration-233) or 0s delay when resetting visibility
const literalTransitionRegex =
  /(?:transition|transition-duration)\s*:[^;]*(?<!\w)(?!0s\b)(?!0ms\b)\d*\.?\d+m?s(?![^(]*\))/i;

let violations = [];

for (const relDir of scanDirs) {
  const dirPath = path.join(rootDir, relDir);
  if (!fs.existsSync(dirPath)) continue;

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (!file.endsWith(".css") || exemptFiles.has(file)) continue;

    const filePath = path.join(dirPath, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      // Strip comments
      const stripped = line.replace(/\/\*.*?\*\//g, "").trim();
      if (!stripped || stripped.startsWith("/*") || stripped.startsWith("*"))
        return;

      if (literalTransitionRegex.test(stripped)) {
        violations.push({
          file: `${relDir}/${file}`,
          line: index + 1,
          content: stripped,
        });
      }
    });
  }
}

if (violations.length > 0) {
  console.error(
    `❌ check-motion-tokens: Found ${violations.length} un-tokenized transition duration(s):`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} -> ${v.content}`);
  }
  console.error(
    "\nPlease use Fibonacci tokens (--vd-duration-89, --vd-duration-144, --vd-duration-233, etc.).",
  );
  process.exit(1);
}

console.log(
  "✅ check-motion-tokens: All transition durations use Fibonacci tokens.",
);
