import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { spawnSync } from "node:child_process";
import { parse, compileScript } from "vue/compiler-sfc";
const require = createRequire(import.meta.url);
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const skill = readFileSync("SKILL.md", "utf8");
if (!/^---\nname: \S+\ndescription: Use when [^\n]+\n---/.test(skill)) {
  throw new Error("Skill needs a name and a single-line Use when description");
}
const program = ts.createProgram(["dist/index.d.ts"], {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const entry = program.getSourceFile("dist/index.d.ts");
if (!entry)
  throw new Error("Build the package before checking its published skill");
const names = new Set(
  checker
    .getExportsOfModule(checker.getSymbolAtLocation(entry))
    .map((symbol) => symbol.name),
);
for (const match of skill.matchAll(/`(Vd\w+|use[A-Z]\w*)(?:\(\))?`/g)) {
  if (!names.has(match[1]))
    throw new Error(`Unknown skill export: ${match[1]}`);
}
for (const name of names) {
  if (/^Vd[A-Z]/.test(name) && !skill.includes(`\`${name}\``))
    throw new Error(`Missing skill component: ${name}`);
}
for (const match of readFileSync("dist/index.d.ts", "utf8").matchAll(
  /composables\/(use\w+)/g,
)) {
  if (!skill.includes(`\`${match[1]}.ts\``))
    throw new Error(`Missing skill module: ${match[1]}`);
}
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
const typed = spawnSync(
  process.execPath,
  [
    require.resolve("vue-tsc/bin/vue-tsc.js"),
    "--noEmit",
    "-p",
    "tsconfig.recipes.json",
  ],
  { stdio: "inherit" },
);
if (typed.status !== 0) throw new Error("Recipe typecheck failed");
process.stdout.write(
  `${manifest.name}: published skill links, typed recipes, API inventory, and package imports verified.\n`,
);
