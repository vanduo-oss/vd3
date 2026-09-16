import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { parse, compileScript } from "vue/compiler-sfc";
const require = createRequire(import.meta.url);
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const skill = readFileSync("SKILL.md", "utf8");
for (const match of skill.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
  const file = match[1].split("#")[0];
  if (!file || /^https?:/.test(file)) continue;
  if (!existsSync(file)) throw new Error(`Broken skill link: ${file}`);
  if (
    !manifest.files.some(
      (entry) =>
        file === entry || file.startsWith(`${entry.replace(/\/$/, "")}/`),
    )
  ) {
    throw new Error(`Skill link is not published: ${file}`);
  }
}
for (const filename of readdirSync("recipes").filter((name) =>
  name.endsWith(".vue"),
)) {
  const path = resolve("recipes", filename);
  const source = readFileSync(path, "utf8");
  const { descriptor, errors } = parse(source, { filename: path });
  if (errors.length) throw new Error(String(errors));
  compileScript(descriptor, { id: filename, inlineTemplate: true });
  for (const match of source.matchAll(
    /(?:from\s+|import\s*)['"](@vanduo-oss\/[^'"]+)['"]/g,
  ))
    require.resolve(match[1]);
}
process.stdout.write(
  `${manifest.name}: published skill links, recipe compilation, and package imports verified.\n`,
);
