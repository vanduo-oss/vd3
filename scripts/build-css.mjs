/**
 * vd3 CSS build — adapted from the CSS portion of the old framework
 * scripts/build.js (the JS half is owned by vite in vd3).
 *
 * Bundles css/vd3.css (inlining @imports in order, rewriting asset url()s
 * for the dist layout) and emits via lightningcss:
 *   dist/vd3.css / dist/vd3.min.css            full bundle        (+ .map)
 *   dist/vd3-core.css / dist/vd3-core.min.css  no-icons variant   (+ .map)
 * and copies fonts/ plus the Phosphor icon weights the bundle references
 * (regular + fill, per css/icons/icons.css) into dist/.
 *
 * Runs after build-tokens.mjs (the entry imports css/core/generated/*) and
 * before `vite build` — see openspec/changes/vd3-token-css-foundation/design.md.
 * The banner carries no timestamp/commit so output is deterministic.
 */
import { transform } from "lightningcss";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
  copyFileSync,
} from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = resolve(rootDir, "dist");

const pkg = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8"));

const getBanner = (mode) => `/*! @vanduo-oss/vd3 v${pkg.version} | ${mode} */`;

/** Recursively copy a directory. */
function copyDir(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);

    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Determine which Phosphor icon weights the bundled CSS actually imports, by
 * following the icon entry imported from css/vd3.css. Returns a Set of weight
 * names (e.g. {'regular','fill'}) or null if it can't be determined (in which
 * case the caller falls back to copying every weight present).
 */
function getReferencedIconWeights() {
  const entryCSS = readFileSync(resolve(rootDir, "css/vd3.css"), "utf8");
  const iconEntryMatch = entryCSS.match(
    /@import\s+url\(['"]?(icons\/[^'")]+)['"]?\)/,
  );
  if (!iconEntryMatch) return null;

  const iconEntryPath = resolve(rootDir, "css", iconEntryMatch[1]);
  if (!existsSync(iconEntryPath)) return null;

  const iconCSS = readFileSync(iconEntryPath, "utf8");
  const weights = new Set();
  // Anchor on @import url(...) so commented example paths aren't counted.
  const weightRegex =
    /@import\s+url\(\s*['"]?[^'")]*phosphor\/([^/]+)\/style\.css/g;
  let match;
  while ((match = weightRegex.exec(iconCSS)) !== null) {
    weights.add(match[1]);
  }
  return weights.size ? weights : null;
}

/** Copy fonts and the referenced icon weights (plus LICENSE) to dist. */
function copyAssets() {
  console.log("Copying assets...");

  const fontsDir = resolve(rootDir, "fonts");
  if (existsSync(fontsDir)) {
    copyDir(fontsDir, resolve(distDir, "fonts"));
    console.log("  fonts/");
  }

  const phosphorSrc = resolve(rootDir, "icons/phosphor");
  if (existsSync(phosphorSrc)) {
    const phosphorDest = resolve(distDir, "icons/phosphor");
    const weights = getReferencedIconWeights();

    if (weights) {
      mkdirSync(phosphorDest, { recursive: true });

      // Preserve top-level files in icons/phosphor (e.g. LICENSE).
      for (const entry of readdirSync(phosphorSrc)) {
        const srcPath = join(phosphorSrc, entry);
        if (statSync(srcPath).isFile()) {
          copyFileSync(srcPath, join(phosphorDest, entry));
        }
      }

      for (const weight of weights) {
        const weightSrc = resolve(phosphorSrc, weight);
        if (existsSync(weightSrc)) {
          copyDir(weightSrc, resolve(phosphorDest, weight));
        }
      }
      console.log(`  icons/ (weights: ${[...weights].join(", ")})`);
    } else {
      copyDir(phosphorSrc, phosphorDest);
      console.log("  icons/ (all weights)");
    }
  }
}

/**
 * Read CSS file and resolve @import statements.
 * Rewrites url() references in imported files to be relative to the entry
 * CSS directory so that asset paths survive inlining.
 */
function resolveCSSImports(filePath, basePath, entryDir, sourceOverride) {
  if (!entryDir) entryDir = basePath;
  // `sourceOverride` lets a caller bundle a variant of the entry file (e.g. the
  // no-icons core build) without writing a temp file to disk. It only applies
  // to the top-level entry; nested @imports are still read from disk.
  let css =
    sourceOverride != null ? sourceOverride : readFileSync(filePath, "utf8");

  // Rewrite non-import url() references to be relative to the entry CSS
  // directory. This ensures font/icon asset paths stay valid after CSS
  // files from different directory depths are inlined together.
  if (basePath !== entryDir) {
    // Temporarily replace @import lines with placeholders so they are
    // not affected by the url() rewriting below.
    const imports = [];
    css = css.replace(/@import\s+url\([^)]+\);?/g, (m) => {
      imports.push(m);
      return `__IMPORT_PLACEHOLDER_${imports.length - 1}__`;
    });

    // Rewrite remaining url() references (fonts, icons, images, etc.)
    css = css.replace(
      /url\(\s*['"]?(?!data:|https?:|#)([^'")\s]+)['"]?\s*\)/g,
      (match, urlPath) => {
        const absoluteUrl = resolve(basePath, urlPath);
        const newPath = relative(entryDir, absoluteUrl);
        return `url('${newPath}')`;
      },
    );

    // Restore @import lines
    css = css.replace(
      /__IMPORT_PLACEHOLDER_(\d+)__/g,
      (_, i) => imports[parseInt(i)],
    );
  }

  // Find all @import url('...') statements
  const importRegex = /@import\s+url\(['"']?([^'")\s]+)['"']?\);?/g;
  let match;

  while ((match = importRegex.exec(css)) !== null) {
    const importPath = match[1];
    const fullPath = resolve(basePath, importPath);

    if (existsSync(fullPath)) {
      const importedCSS = resolveCSSImports(
        fullPath,
        dirname(fullPath),
        entryDir,
      );
      css = css.replace(match[0], importedCSS);
    } else {
      console.warn(`Import not found: ${importPath}`);
    }
  }

  return css;
}

/** Rewrite asset paths in CSS for the dist folder structure. */
function rewriteAssetPaths(css) {
  // Rewrite font paths: any number of ../ followed by fonts/ -> ./fonts/
  css = css.replace(/url\(\s*['"]?(?:\.\.\/)+fonts\//g, "url('./fonts/");

  // Rewrite icon paths: any number of ../ followed by icons/ -> ./icons/
  css = css.replace(/url\(\s*['"]?(?:\.\.\/)+icons\//g, "url('./icons/");

  return css;
}

// Build CSS.
// `variant` is 'full' (default) or 'core' (no-icons: the bundled icon entry
// @import is stripped so consumers who ship their own icons get a smaller file).
function buildCSS(isMinify, banner, { variant = "full" } = {}) {
  const isCore = variant === "core";
  const inputPath = resolve(rootDir, "css/vd3.css");
  const baseName = isCore ? "vd3-core" : "vd3";
  const outName = isMinify ? `${baseName}.min.css` : `${baseName}.css`;
  const outputPath = resolve(distDir, outName);

  try {
    // For the core variant, strip the icon entry @import from the top-level
    // source so no icon weight rules are inlined. The full variant reads
    // the entry from disk unchanged.
    let sourceOverride;
    if (isCore) {
      const entrySrc = readFileSync(inputPath, "utf8");
      sourceOverride = entrySrc.replace(
        /^[ \t]*@import\s+url\(\s*['"]?icons\/[^'")]+['"]?\s*\);?[ \t]*\r?\n?/gm,
        "",
      );
    }

    // Resolve all imports into one file
    let bundledCSS = resolveCSSImports(
      inputPath,
      dirname(inputPath),
      dirname(inputPath),
      sourceOverride,
    );

    // Rewrite asset paths for dist folder structure
    bundledCSS = rewriteAssetPaths(bundledCSS);

    // Transform/minify with LightningCSS
    const { code, map } = transform({
      filename: `${baseName}.css`,
      code: Buffer.from(bundledCSS),
      minify: isMinify,
      sourceMap: true,
    });

    // Prepend banner to CSS
    const finalCSS = banner + "\n" + code.toString();
    writeFileSync(outputPath, finalCSS);
    if (map) {
      writeFileSync(outputPath + ".map", map);
    }

    const sizeKB = (finalCSS.length / 1024).toFixed(1);
    console.log(`  ${outName} (${sizeKB} KB)`);
  } catch (error) {
    console.error("CSS build failed:", error.message);
    if (error.loc) {
      console.error(`  at line ${error.loc.line}, column ${error.loc.column}`);
    }
    process.exit(1);
  }
}

console.log(`vd3 CSS build (v${pkg.version})`);
mkdirSync(distDir, { recursive: true });
copyAssets();

for (const mode of ["development", "production"]) {
  const isMinify = mode === "production";
  const banner = getBanner(mode);
  console.log(`Building ${mode} CSS...`);
  buildCSS(isMinify, banner);
  buildCSS(isMinify, banner, { variant: "core" });
}

console.log("CSS build complete.");
