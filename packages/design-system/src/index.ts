/**
 * Public API barrel for @decklee/design-system.
 *
 * TS utilities are re-exported here; the .astro primitives are NOT — consumers
 * import them directly via the "./primitives/*" exports map path.
 */
export { resolveTheme, getRegisteredThemes } from "./theme-resolver.js";
export { highlight, wrapLines, SUPPORTED_LANGUAGES } from "./highlight.js";
export { validateTheme } from "./validate-theme.js";
export type { ThemeValidationResult } from "./validate-theme.js";

// NOTE (GC-4): the former TOKENS_CSS_PATH / DEV_THEME_CSS_PATH constants were removed.
// They resolved against import.meta.url → dist/tokens/* which tsc never emits (CSS lives
// only in src/), so they were broken for every consumer. The CSS is exposed via the
// package "exports" map instead — import "@decklee/design-system/tokens" (and
// "@decklee/design-system/themes/dev"), which Vite/Astro resolve to the real src files.
