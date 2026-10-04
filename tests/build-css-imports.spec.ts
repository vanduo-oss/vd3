import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

import { expect, it } from "vitest";

it("fails the build when a nested CSS import is missing", () => {
  const root = process.cwd();
  const fixture = mkdtempSync(join(tmpdir(), "vd3-css-import-"));
  try {
    mkdirSync(join(fixture, "scripts"));
    mkdirSync(join(fixture, "css"));
    copyFileSync(
      resolve(root, "scripts/build-css.mjs"),
      join(fixture, "scripts/build-css.mjs"),
    );
    symlinkSync(
      resolve(root, "node_modules"),
      join(fixture, "node_modules"),
      "dir",
    );
    writeFileSync(
      join(fixture, "package.json"),
      JSON.stringify({ version: "test", type: "module" }),
    );
    writeFileSync(join(fixture, "css/vd3.css"), "@import url('nested.css');");
    writeFileSync(
      join(fixture, "css/nested.css"),
      "@import url('missing.css');",
    );
    const result = spawnSync(process.execPath, ["scripts/build-css.mjs"], {
      cwd: fixture,
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("CSS import not found: missing.css");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
