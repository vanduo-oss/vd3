import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

// Library artifacts, not a prediction of a consumer's tree-shaken application.
// Baseline after adding Fibonacci motion system (v1.9.0).
const budgets = [
  ["vd3.min.css", 650000, 102000],
  ["vd3-core.min.css", 515000, 77000],
  ["index.js", 355000, 88000],
];
for (const [name, rawLimit, gzipLimit] of budgets) {
  const bytes = readFileSync(new URL(`../dist/${name}`, import.meta.url));
  const compressed = gzipSync(bytes).length;
  if (bytes.length > rawLimit || compressed > gzipLimit) {
    throw new Error(
      `${name}: ${bytes.length}/${rawLimit} raw, ${compressed}/${gzipLimit} gzip bytes`,
    );
  }
  process.stdout.write(
    `${name}: ${bytes.length} raw, ${compressed} gzip bytes\n`,
  );
}
