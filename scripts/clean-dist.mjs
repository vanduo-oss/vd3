/**
 * Reset dist/ at the head of the build chain. vite runs with
 * `build.emptyOutDir: false` so it cannot clobber the token/CSS artifacts
 * emitted before it — this explicit step is the only thing that cleans.
 * See openspec/changes/vd3-token-css-foundation/design.md.
 */
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
console.log("dist/ reset");
