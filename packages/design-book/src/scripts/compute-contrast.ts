/**
 * compute-contrast.ts — WCAG 2.1 contrast helpers (pure, side-effect-free).
 *
 * No top-level side effects, no class, no process.exit — so unit tests import it
 * without triggering any write. generate-token-data.ts composes these to label
 * every color swatch against the dev theme's bg-base and emit non-fatal
 * CONTRAST_WARN: lines to stderr for pairs below threshold.
 */

export type Rgb = [number, number, number];

export type ContrastLabel = "AAA" | "AA" | "AA Large/UI" | "FAIL";

/** The dev theme page/slide background (rgb(11,12,17)) — the contrast baseline. */
export const BG_BASE: Rgb = [11, 12, 17];

/** WCAG AA threshold for normal-size body text. */
export const AA_NORMAL = 4.5;

/** WCAG threshold for UI components and large text. */
export const AA_UI = 3;

/** WCAG AAA threshold for normal-size body text. */
export const AAA_NORMAL = 7;

/** Parse `rgb(11, 12, 17)` (whitespace-tolerant) into an [r,g,b] tuple. */
export function parseRgb(str: string): Rgb {
  const match = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) {
    throw new Error(`parseRgb: cannot parse "${str}" as an rgb()/rgba() string`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** WCAG 2.1 relative luminance: linearize each sRGB channel, then weight. */
export function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio: (L1 + 0.05) / (L2 + 0.05) with L1 >= L2. */
export function contrastRatio(a: Rgb, b: Rgb = BG_BASE): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Classify a ratio against WCAG thresholds. */
export function label(ratio: number): ContrastLabel {
  if (ratio >= AAA_NORMAL) return "AAA";
  if (ratio >= AA_NORMAL) return "AA";
  if (ratio >= AA_UI) return "AA Large/UI";
  return "FAIL";
}
