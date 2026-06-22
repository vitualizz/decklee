/**
 * Template assembly — bundle the viewer into one minified IIFE, inline all CSS,
 * and stitch a standalone HTML5 document with an empty deck island. Pure: it
 * returns a string and never writes to disk (the build-template script owns
 * disk writes).
 *
 * Module resolution uses `import.meta.resolve` (ESM, Node 20.6+/22) rather than
 * createRequire(...).resolve. The workspace packages publish ESM-only `exports`
 * maps (an `import` condition with no `require` and no `./package.json` entry),
 * which CJS resolution cannot read — `import.meta.resolve` honours the `import`
 * condition and resolves them all (viewer dist, reveal CSS, design-system token
 * subpaths that point back into src/).
 */
import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { NO_JS_MESSAGE } from "@decklee/viewer";

/** Reserved for future resolveTheme() wiring; v1 always emits the dev theme. */
export type AssembleOpts = {
  theme?: string;
};

/** The two font CDN hosts the template is permitted to reference. */
const ALLOWED_FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

/** Matches `url(...)` whose target is an external (http(s) or protocol-relative) host. */
const EXTERNAL_URL_RE = /url\(\s*['"]?(?:https?:)?\/\/([^/'")\s]+)/gi;

/**
 * CSS files concatenated, in cascade order, into the inline <style>. reveal's
 * reset+base first, then the design-system tokens, then the dev theme so theme
 * values win. The token files are read individually because tokens/index.css is
 * a pure @import barrel a browser would re-fetch — useless when inlined.
 */
const CSS_SOURCES: ReadonlyArray<string> = [
  "reveal.js/reset.css",
  "reveal.js/reveal.css",
  "@decklee/design-system/tokens/color",
  "@decklee/design-system/tokens/typography",
  "@decklee/design-system/tokens/spacing",
  "@decklee/design-system/tokens/syntax",
  "@decklee/design-system/themes/dev",
];

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap";

/** Resolve a module specifier to an absolute filesystem path via ESM resolution. */
function resolvePath(specifier: string): string {
  return fileURLToPath(import.meta.resolve(specifier));
}

/**
 * Absolute path to the browser entry esbuild bundles. The source sits next to
 * this module: `template-entry.ts` when running from src/ (build-template runs
 * the .ts directly via --experimental-strip-types) or `template-entry.js` when
 * running from the published dist/. Pick whichever exists so assembleTemplate()
 * works in both contexts.
 */
function entryPointPath(): string {
  const ts = fileURLToPath(new URL("./template-entry.ts", import.meta.url));
  if (existsSync(ts)) return ts;
  return fileURLToPath(new URL("./template-entry.js", import.meta.url));
}

/**
 * Build the standalone HTML template. Async because esbuild's build API is.
 *
 * @throws Error when the viewer dist is missing, esbuild fails, or the inlined
 *   CSS references an external host other than the Google Fonts CDNs.
 */
export async function assembleTemplate(_opts?: AssembleOpts): Promise<string> {
  assertViewerDist();

  const iife = await bundleViewer();
  const css = gatherCss();
  assertCssSelfContained(css);

  const coreVersion = readCoreVersion();
  const revealVersion = readRevealVersion();

  return renderHtml({ iife, css, coreVersion, revealVersion });
}

function assertViewerDist(): void {
  const viewerDist = resolvePath("@decklee/viewer");
  if (!existsSync(viewerDist)) {
    throw new Error(
      "assembleTemplate: viewer dist not found. Run `pnpm -r build` before building the template.",
    );
  }
}

async function bundleViewer(): Promise<string> {
  const result = await build({
    entryPoints: [entryPointPath()],
    bundle: true,
    platform: "browser",
    format: "iife",
    minify: true,
    target: ["es2020"],
    write: false,
    // Bundle the runtime everything — reveal.mjs, the Notes plugin (notes.mjs),
    // Zod, and the highlight.js subset the viewer pulls in. The ONLY externals
    // are Node builtins (`node:fs` etc.): the design-system barrel transitively
    // reachable from the viewer re-exports maintainer-time helpers
    // (theme-resolver, validate-theme) that touch node:fs but are never invoked
    // by boot(). Marking them external keeps the browser bundle building; the
    // dead branches are unreachable at runtime.
    external: ["node:*"],
    outfile: "template-bundle.js",
  });
  return result.outputFiles[0].text;
}

function gatherCss(): string {
  return CSS_SOURCES.map((spec) =>
    readFileSync(resolvePath(spec), "utf-8"),
  ).join("\n");
}

function assertCssSelfContained(css: string): void {
  for (const match of css.matchAll(EXTERNAL_URL_RE)) {
    const host = match[1];
    if (!ALLOWED_FONT_HOSTS.has(host)) {
      throw new Error(
        `assembleTemplate: concatenated CSS contains external url() reference — cannot inline: ${match[0]}`,
      );
    }
  }
}

function readCoreVersion(): string {
  const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
  return JSON.parse(readFileSync(pkgPath, "utf-8")).version;
}

function readRevealVersion(): string {
  // reveal's exports map exposes neither `.` for require nor ./package.json, so
  // derive the version from the resolved CSS URL: it sits in reveal.js/dist/,
  // making the package manifest its `../package.json`.
  const revealCssUrl = import.meta.resolve("reveal.js/reveal.css");
  const pkgPath = fileURLToPath(new URL("../package.json", revealCssUrl));
  return JSON.parse(readFileSync(pkgPath, "utf-8")).version;
}

function renderHtml(parts: {
  iife: string;
  css: string;
  coreVersion: string;
  revealVersion: string;
}): string {
  const { iife, css, coreVersion, revealVersion } = parts;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DeckLee Presentation</title>
  <!-- decklee-template-version: ${coreVersion} -->
  <!-- decklee-reveal-version: ${revealVersion} -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${GOOGLE_FONTS_HREF}" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div class="reveal">
    <div class="slides"></div>
  </div>
  <noscript>${NO_JS_MESSAGE}</noscript>
  <script type="application/json" id="decklee-deck">{}</script>
  <script>${iife}</script>
</body>
</html>`;
}
