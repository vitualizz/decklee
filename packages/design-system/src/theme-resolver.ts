/**
 * Theme resolution (FR-06, AC-05). Resolves a theme_id to its CSS URL or
 * throws with the list of valid themes.
 */
import { THEME_REGISTRY } from "./themes/index.js";

export function resolveTheme(theme_id: string): string {
  const css = THEME_REGISTRY[theme_id];
  if (css === undefined) {
    const valid = Object.keys(THEME_REGISTRY).join(", ");
    throw new Error(
      `Unknown theme_id "${theme_id}". Valid themes: ${valid}.`,
    );
  }
  return css;
}

export function getRegisteredThemes(): string[] {
  return Object.keys(THEME_REGISTRY);
}
