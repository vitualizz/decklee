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
 *
 * A theme MAY also declare a NON-SCALAR "ART DIRECTION" block — theme-scoped
 * rules (sub-selectors) for effects that cannot be a single scalar color token
 * (gradients, glow). Those rules are pure CSS and MUST contain no external
 * url() reference (no @import, no remote asset) so the assembled HTML stays
 * self-contained (HC-8). This scanner asserts that additively; a theme with no
 * art rules (e.g. dev.css) is exempt by construction and stays green.
 */
import { readFileSync } from "node:fs";

export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
}

const COLOR_DECL = /^\s*(--dk-color-[\w-]+)\s*:\s*(.+?);/;

/**
 * Matches `url(...)` whose target is an external host (http(s):// or the
 * protocol-relative //) or an @import — the references that would break the
 * self-contained-HTML guarantee if they appeared in a theme's art rules.
 */
const EXTERNAL_URL_RE = /url\(\s*['"]?(?:https?:)?\/\//i;
const AT_IMPORT_RE = /@import\b/i;

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

  // Additive: art-direction rules must be self-contained — no external url()
  // and no @import. Strip /* ... */ comments first so the doc header (which
  // documents the "NO @import" rule in prose) cannot trip the scan. dev.css
  // declares no art rules, so it is exempt by construction.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "");
  if (AT_IMPORT_RE.test(code)) {
    errors.push("@import is not permitted in a theme (must be self-contained)");
  }
  if (EXTERNAL_URL_RE.test(code)) {
    errors.push(
      "art-direction rules must not reference an external url() (must be self-contained)",
    );
  }

  return { valid: errors.length === 0, errors };
}
