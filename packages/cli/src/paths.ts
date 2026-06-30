/**
 * Centralized import.meta.url path math. Every consumer that needs the bundled
 * template or the repo root resolves it through these helpers so bin, init,
 * the generate script, and the drift-check test never disagree on the layout.
 *
 * Layout note: tsc emits `dist/` mirroring `src/` (rootDir: "src"). So
 * dist/bin.js sits directly under dist/, and the shipped templates/ dir is a
 * sibling of dist/ inside the package — i.e. ../templates from dist/.
 */
import { fileURLToPath } from "node:url";

/**
 * Absolute path to the pre-built `decklee-template.html` shipped beside the
 * compiled CLI. Resolved from a compiled module under dist/ (e.g. dist/bin.js
 * or dist/commands/build.js — both resolve `../templates` to the package's
 * templates/ dir because URL resolution is relative to the file's own URL).
 *
 * NOTE: callers that live deeper than dist/ root (dist/commands/*) must pass
 * their own import.meta.url is NOT needed — build.ts imports this helper, and
 * the helper resolves relative to ITS OWN compiled location (dist/paths.js),
 * which is at dist/ root, so ../templates is correct.
 */
export function resolveBundledTemplate(): string {
  return fileURLToPath(new URL("../templates/decklee-template.html", import.meta.url));
}

/**
 * Absolute path to the static `init-scaffold/` snapshot shipped beside the
 * compiled CLI. Mirrors {@link resolveBundledTemplate}: the bundled output
 * collapses to dist/ root (esbuild --splitting), so `../templates` resolves to
 * the package's templates/ dir regardless of which chunk this function lands in.
 */
export function resolveInitScaffold(): string {
  return fileURLToPath(new URL("../templates/init-scaffold", import.meta.url));
}

/**
 * Repo root resolved from a script under packages/cli/scripts/ at RUNTIME via
 * `node --experimental-strip-types` (the script runs from its source location,
 * NOT from dist/). packages/cli/scripts/ → up 3 levels → repo root.
 */
export function repoRootFromScript(): string {
  return fileURLToPath(new URL("../../../", import.meta.url));
}

/**
 * Repo root resolved from a test/source module under packages/cli/src/ run by
 * vitest (which executes the .ts source in place, NOT dist/). This helper lives
 * in src/paths.ts, so URL resolution is relative to ITS OWN location regardless
 * of the calling module: packages/cli/src/ → up 3 levels → repo root.
 */
export function repoRootFromTest(): string {
  return fileURLToPath(new URL("../../../", import.meta.url));
}
