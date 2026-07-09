#!/usr/bin/env node
/**
 * Class-coverage guard.
 *
 * Asserts that every `vd-*` class the Vd* components render has a matching
 * selector in the bundled stylesheet (`dist/vd3.min.css`, built from this
 * repo's `css/` tree). This is the regression gate for the CSS<->component
 * class drift that left VdModal (and others) unstyled in the old line's 0.2.0.
 *
 * Two checks, both with zero false positives on this codebase:
 *   1. STATIC (exact): literal classes from `class="..."` attributes and from
 *      string literals inside `:class="..."` bindings must each have an exact
 *      `.<class>` selector in the CSS.
 *   2. DYNAMIC (prefix): template-literal class fragments like `vd-modal-panel-${size}`
 *      (found inside `:class` bindings, or in <script> lines that mention "class"
 *      — e.g. a computed `sizeClass`) must have at least one selector starting with
 *      `.<prefix>`. We don't try to enumerate every runtime suffix; a whole missing
 *      component (zero matching selectors) is what this catches.
 *
 * State classes (`is-open`, `is-active`, ...) are not `vd-*` and are ignored.
 *
 * Usage: node scripts/check-class-coverage.mjs [path/to/bundle.css]
 * Exits non-zero (and prints the gaps) on drift.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const componentsDir = resolve(root, "src", "components");
const cssPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(root, "dist", "vd3.min.css");

// Classes that are intentionally not styled here (documented exceptions).
const IGNORE = new Set([
  // add well-known consumer/utility exceptions here if they ever arise
]);

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (full.endsWith(".vue")) out.push(full);
  }
  return out;
}

// --- collect selectors present in the built CSS ---
const css = readFileSync(cssPath, "utf8");
const cssClasses = new Set();
for (const m of css.matchAll(/\.(vd-[a-zA-Z0-9_-]+)/g)) cssClasses.add(m[1]);

// --- collect classes emitted by the components ---
const staticClasses = new Map(); // class -> Set(file)
const dynamicPrefixes = new Map(); // prefix (with trailing dash) -> Set(file)

const addStatic = (cls, file) => {
  if (!staticClasses.has(cls)) staticClasses.set(cls, new Set());
  staticClasses.get(cls).add(file);
};
const addDynamic = (prefix, file) => {
  if (!dynamicPrefixes.has(prefix)) dynamicPrefixes.set(prefix, new Set());
  dynamicPrefixes.get(prefix).add(file);
};

for (const file of walk(componentsDir)) {
  const src = readFileSync(file, "utf8");
  const base = file.slice(componentsDir.length + 1);

  // 1. static `class="..."` attributes (NOT `:class`, excluded via lookbehind)
  for (const m of src.matchAll(/(?<=\s)class="([^"]*)"/g)) {
    for (const tok of m[1].split(/\s+/)) {
      if (tok.startsWith("vd-")) addStatic(tok, base);
    }
  }

  // 2. `:class="..."` / `:class='...'` bindings (may span lines)
  for (const m of src.matchAll(/:class=("([^"]*)"|'([^']*)')/g)) {
    const expr = m[2] ?? m[3] ?? "";
    // string literals -> static classes
    for (const s of expr.matchAll(/(['"`])(vd-[a-z0-9-]+)\1/g))
      addStatic(s[2], base);
    // template literals -> dynamic prefixes
    for (const t of expr.matchAll(/`(vd-[a-z0-9-]*?)\$\{/g))
      addDynamic(t[1], base);
  }

  // 3. <script> template literals on lines mentioning "class" (e.g. computed sizeClass)
  for (const line of src.split("\n")) {
    if (!/class/i.test(line)) continue;
    for (const t of line.matchAll(/`(vd-[a-z0-9-]*?)\$\{/g))
      addDynamic(t[1], base);
  }

  // 4. Any quoted vd-* string literal anywhere (catches computed class strings
  //    that wrap across lines, e.g. a ternary in a `*Class` computed). Backtick
  //    template literals are intentionally NOT matched here — those are handled
  //    as dynamic prefixes scoped to :class, so :id / :aria backtick literals
  //    (e.g. `vd-accordion-panel-${id}`) don't leak in as false positives.
  for (const s of src.matchAll(/(['"])(vd-[a-z0-9-]+)\1/g))
    addStatic(s[2], base);
}

// --- compare ---
const missingStatic = [];
for (const [cls, files] of staticClasses) {
  if (IGNORE.has(cls)) continue;
  if (!cssClasses.has(cls)) missingStatic.push([cls, [...files].join(", ")]);
}

const missingDynamic = [];
for (const [prefix, files] of dynamicPrefixes) {
  const hasMatch = [...cssClasses].some((c) => c.startsWith(prefix));
  if (!hasMatch) missingDynamic.push([prefix + "*", [...files].join(", ")]);
}

missingStatic.sort((a, b) => a[0].localeCompare(b[0]));
missingDynamic.sort((a, b) => a[0].localeCompare(b[0]));

const total = missingStatic.length + missingDynamic.length;
if (total === 0) {
  console.log(
    `✅ class-coverage: all ${staticClasses.size} static + ${dynamicPrefixes.size} dynamic vd-* classes have selectors in ${cssPath.split("/").pop()}`,
  );
  process.exit(0);
}

console.error(
  `❌ class-coverage: ${total} vd-* class(es) rendered by components have no selector in ${cssPath.split("/").pop()}:\n`,
);
if (missingStatic.length) {
  console.error("  Missing exact selectors:");
  for (const [cls, files] of missingStatic)
    console.error(`    .${cls.padEnd(32)} (${files})`);
}
if (missingDynamic.length) {
  console.error("\n  Missing dynamic prefixes (no selector starts with):");
  for (const [prefix, files] of missingDynamic)
    console.error(`    .${prefix.padEnd(32)} (${files})`);
}
console.error(
  "\nAdd the missing selectors to this repo's css/ tree (additively) and rebuild.",
);
process.exit(1);
