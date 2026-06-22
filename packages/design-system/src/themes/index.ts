/**
 * Theme registry — the single source of truth mapping a theme_id to its CSS
 * URL. theme-resolver.ts consumes this; add a theme here and nowhere else.
 */
export const THEME_REGISTRY: Record<string, string> = {
  dev: new URL("./dev/dev.css", import.meta.url).href,
};
