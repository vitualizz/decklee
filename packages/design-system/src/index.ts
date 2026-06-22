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

/** Absolute URL to the aggregated token stylesheet (color + type + space + syntax). */
export const TOKENS_CSS_PATH = new URL("./tokens/index.css", import.meta.url).href;

/** Absolute URL to the dev theme stylesheet. */
export const DEV_THEME_CSS_PATH = new URL("./themes/dev/dev.css", import.meta.url).href;
