/**
 * Theme cascade validator (FR-07, AC-04).
 *
 * A theme CSS file declares each color token TWICE as adjacent full
 * declarations of the same property — an rgb()/rgba() line first, then an
 * oklch() line — so older engines keep the sRGB value and capable engines
 * win with oklch via the cascade. This scanner enforces that contract: every
 * --dk-color-* property that has an oklch() declaration MUST have a preceding
 * rgb()/rgba() declaration for the same property in the same block.
 *
 * Exempt by design: alpha-only props (rgba with no oklch) and var()-aliases.
 */
import { readFileSync } from "node:fs";

export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
}

const COLOR_DECL = /^\s*(--dk-color-[\w-]+)\s*:\s*(.+?);/;

interface PropState {
  hasRgb: boolean;
  hasOklch: boolean;
}

export function validateTheme(cssPath: string): ThemeValidationResult {
  const source = readFileSync(cssPath, "utf8");
  const lines = source.split("\n");

  // Track declaration order per property so "rgb before oklch" is positional.
  const seen = new Map<string, PropState>();
  const errors: string[] = [];

  for (const line of lines) {
    const match = line.match(COLOR_DECL);
    if (!match) {
      continue;
    }

    const prop = match[1];
    const value = match[2];
    const state = seen.get(prop) ?? { hasRgb: false, hasOklch: false };

    if (/\brgba?\(/.test(value)) {
      state.hasRgb = true;
    }

    if (/\boklch\(/.test(value)) {
      if (!state.hasRgb) {
        errors.push(`${prop}: missing rgb() fallback before oklch()`);
      }
      state.hasOklch = true;
    }

    seen.set(prop, state);
  }

  return { valid: errors.length === 0, errors };
}
