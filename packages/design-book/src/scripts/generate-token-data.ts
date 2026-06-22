/**
 * generate-token-data.ts — build-time token catalog generator.
 *
 * Reads the shipped @decklee/design-system CSS (tokens/*.css + themes/dev/dev.css)
 * as the single source of truth and produces typed data for the book's
 * ColorSwatchGrid, TokenReferenceTable, TypeSpecimen and SpacingScaleViz. Every
 * color swatch is scored for WCAG contrast against the dev bg-base; alpha-only
 * tokens are exempt (labeled "alpha-blended — N/A"). CONTRAST_WARN: lines go to
 * stderr only (non-fatal); stdout stays clean. Deterministic ordering.
 *
 * Run via `tsx src/scripts/generate-token-data.ts` (invoked by `prebuild`).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  parseRgb,
  contrastRatio,
  label,
  AA_NORMAL,
  AA_UI,
  type ContrastLabel,
} from "./compute-contrast.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DS_SRC = resolve(HERE, "../../../design-system/src");
const OUT_PATH = resolve(HERE, "../data/token-data.ts");

const DEV_THEME_ID = "dev";
const ALPHA_ONLY_TOKENS = new Set(["--dk-color-border", "--dk-color-overlay-bg"]);
const ALPHA_NA: string = "alpha-blended — N/A";

export type ColorSwatch = {
  token: string;
  rgb: string;
  oklch: string;
  role: string;
  contrastRatio: number | null;
  label: ContrastLabel | "N/A";
  derivedFrom?: string;
};

export type TokenRow = {
  name: string;
  oklch: string;
  themes: Record<string, string>;
  role: string;
};

export type TypeScaleSpecimen = { token: string; sizePx: number; label: string };
export type TypeFamily = { token: string; value: string; role: string };
export type SpacingStep = { token: string; valuePx: number };
export type SpacingPad = { token: string; valuePx: number; axis: "x" | "y" };

export type TokenData = {
  COLOR_SWATCHES: ColorSwatch[];
  TOKEN_ROWS: TokenRow[];
  TYPE_SCALE: TypeScaleSpecimen[];
  TYPE_FAMILIES: TypeFamily[];
  SPACING_STEPS: SpacingStep[];
  SPACING_PADS: SpacingPad[];
};

/** Semantic role descriptions (hand-maintained — CSS has no role metadata). */
const COLOR_ROLES: Record<string, string> = {
  "--dk-color-bg-base": "Page / slide background (darkest)",
  "--dk-color-bg-surface": "Raised surface / card / panel background",
  "--dk-color-fg-primary": "Primary text / headings",
  "--dk-color-fg-secondary": "Body / secondary text",
  "--dk-color-fg-muted": "Muted / caption / de-emphasized text",
  "--dk-color-accent-1": "Primary accent (blue)",
  "--dk-color-accent-2": "Secondary accent (green/teal)",
  "--dk-color-border": "Hairline border (alpha-only)",
  "--dk-color-overlay-bg": "Scrim behind overlays (alpha-only)",
  "--dk-color-syntax-keyword": "Code keyword color",
  "--dk-color-syntax-string": "Code string color",
  "--dk-color-syntax-comment": "Code comment color",
};

/** Syntax aliases resolve to other tokens at :root rather than carrying a value. */
const SYNTAX_ALIASES: Record<string, string> = {
  "--dk-color-syntax-keyword": "--dk-color-accent-1",
  "--dk-color-syntax-string": "--dk-color-accent-2",
  "--dk-color-syntax-comment": "--dk-color-fg-secondary",
};

const ORDERED_COLOR_TOKENS = Object.keys(COLOR_ROLES);

type Declarations = Map<string, string[]>;

/** Collect every `--dk-*: value;` declaration (a token may appear twice: rgb then oklch). */
function parseDeclarations(css: string): Declarations {
  const out: Declarations = new Map();
  const re = /(--dk-[\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const name = m[1];
    const value = m[2].trim();
    if (!out.has(name)) out.set(name, []);
    out.get(name)!.push(value);
  }
  return out;
}

function first(decls: Declarations, name: string): string {
  return decls.get(name)?.[0] ?? "";
}

function pick(values: string[] | undefined, predicate: (v: string) => boolean): string {
  return (values ?? []).find(predicate) ?? "";
}

function readCss(rel: string): string {
  return readFileSync(resolve(DS_SRC, rel), "utf8");
}

export function buildTokenData(): TokenData {
  const rootColor = parseDeclarations(readCss("tokens/color.css"));
  const devTheme = parseDeclarations(readCss("themes/dev/dev.css"));
  const typography = parseDeclarations(readCss("tokens/typography.css"));
  const spacing = parseDeclarations(readCss("tokens/spacing.css"));

  const COLOR_SWATCHES: ColorSwatch[] = [];
  const TOKEN_ROWS: TokenRow[] = [];

  for (const token of ORDERED_COLOR_TOKENS) {
    const baselineOklch = pick(rootColor.get(token), (v) => v.startsWith("oklch")) || first(rootColor, token);
    const role = COLOR_ROLES[token] ?? "";
    const alias = SYNTAX_ALIASES[token];

    // Dev theme value: prefer the rgb()/rgba() fallback line (the displayable sRGB value).
    let devRgb = pick(devTheme.get(token), (v) => v.startsWith("rgb"));
    let devOklch = pick(devTheme.get(token), (v) => v.startsWith("oklch"));

    if (alias) {
      // Syntax aliases inherit whatever the active theme set on their source token.
      devRgb = pick(devTheme.get(alias), (v) => v.startsWith("rgb"));
      devOklch = pick(devTheme.get(alias), (v) => v.startsWith("oklch"));
    }

    const isAlpha = ALPHA_ONLY_TOKENS.has(token);
    let ratio: number | null = null;
    let lbl: ContrastLabel | "N/A" = "N/A";

    if (!isAlpha && devRgb.startsWith("rgb(")) {
      ratio = Number(contrastRatio(parseRgb(devRgb)).toFixed(2));
      lbl = label(ratio);
      const threshold = role.startsWith("Code") ? AA_NORMAL : AA_NORMAL;
      const uiThreshold = AA_UI;
      if (ratio < threshold && ratio < uiThreshold) {
        process.stderr.write(
          `CONTRAST_WARN: ${token} (${devRgb}) vs bg-base = ${ratio}:1 — below ${AA_UI}:1 UI floor\n`,
        );
      } else if (ratio < threshold) {
        process.stderr.write(
          `CONTRAST_WARN: ${token} (${devRgb}) vs bg-base = ${ratio}:1 — below ${AA_NORMAL}:1 normal-text floor (OK for large/UI)\n`,
        );
      }
    }

    COLOR_SWATCHES.push({
      token,
      rgb: isAlpha ? first(devTheme, token) || ALPHA_NA : devRgb || devOklch || ALPHA_NA,
      oklch: baselineOklch,
      role,
      contrastRatio: ratio,
      label: isAlpha ? "N/A" : lbl,
      ...(alias ? { derivedFrom: alias } : {}),
    });

    TOKEN_ROWS.push({
      name: token,
      oklch: baselineOklch,
      themes: { [DEV_THEME_ID]: isAlpha ? first(devTheme, token) : devRgb || devOklch },
      role,
    });
  }

  // Typography — fixed px scale + the three families.
  const TYPE_SCALE: TypeScaleSpecimen[] = [
    { token: "--dk-type-scale-hero", label: "Hero" },
    { token: "--dk-type-scale-h1", label: "H1" },
    { token: "--dk-type-scale-h2", label: "H2" },
    { token: "--dk-type-scale-body", label: "Body" },
    { token: "--dk-type-scale-code", label: "Code" },
    { token: "--dk-type-scale-caption", label: "Caption" },
  ].map((s) => ({ ...s, sizePx: parseInt(first(typography, s.token), 10) }));

  const TYPE_FAMILIES: TypeFamily[] = [
    { token: "--dk-type-family-display", role: "Headings / hero / titles" },
    { token: "--dk-type-family-body", role: "Body / paragraph" },
    { token: "--dk-type-family-code", role: "Code / eyebrow / labels (mono-as-UI)" },
  ].map((f) => ({ ...f, value: first(typography, f.token) }));

  // Spacing — 12 steps + two slide-pad tokens.
  const SPACING_STEPS: SpacingStep[] = [];
  for (let i = 1; i <= 12; i++) {
    const token = `--dk-space-${i}`;
    SPACING_STEPS.push({ token, valuePx: parseInt(first(spacing, token), 10) });
  }

  const SPACING_PADS: SpacingPad[] = [
    { token: "--dk-space-slide-pad-x", valuePx: parseInt(first(spacing, "--dk-space-slide-pad-x"), 10), axis: "x" },
    { token: "--dk-space-slide-pad-y", valuePx: parseInt(first(spacing, "--dk-space-slide-pad-y"), 10), axis: "y" },
  ];

  return { COLOR_SWATCHES, TOKEN_ROWS, TYPE_SCALE, TYPE_FAMILIES, SPACING_STEPS, SPACING_PADS };
}

function emit(): void {
  const data = buildTokenData();
  const banner =
    "// AUTO-GENERATED by src/scripts/generate-token-data.ts — do not edit by hand.\n" +
    "// Regenerated by the `prebuild` npm script before every astro build.\n";
  const body =
    `import type {\n` +
    `  ColorSwatch,\n  TokenRow,\n  TypeScaleSpecimen,\n  TypeFamily,\n  SpacingStep,\n  SpacingPad,\n` +
    `} from "../scripts/generate-token-data.js";\n\n` +
    `export const COLOR_SWATCHES: ColorSwatch[] = ${JSON.stringify(data.COLOR_SWATCHES, null, 2)};\n\n` +
    `export const TOKEN_ROWS: TokenRow[] = ${JSON.stringify(data.TOKEN_ROWS, null, 2)};\n\n` +
    `export const TYPE_SCALE: TypeScaleSpecimen[] = ${JSON.stringify(data.TYPE_SCALE, null, 2)};\n\n` +
    `export const TYPE_FAMILIES: TypeFamily[] = ${JSON.stringify(data.TYPE_FAMILIES, null, 2)};\n\n` +
    `export const SPACING_STEPS: SpacingStep[] = ${JSON.stringify(data.SPACING_STEPS, null, 2)};\n\n` +
    `export const SPACING_PADS: SpacingPad[] = ${JSON.stringify(data.SPACING_PADS, null, 2)};\n`;
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, banner + "\n" + body, "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  emit();
}
