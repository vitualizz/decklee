/**
 * T-014 — Parity fixtures (R-NEW-01).
 *
 * These EXACTLY mirror the content_props used in the design-system snapshot tests
 * (packages/design-system/src/primitives/{Hero,TwoUp,Code,Quote}.test.ts).
 * Same inputs → structural DOM equivalence between the twin and the Astro snapshot.
 *
 * 8 fixtures total — 2 per layout.
 */
import type { CodeProps, HeroProps, QuoteProps, TwoUpProps } from "@decklee/schema";

// ---------------------------------------------------------------------------
// Hero fixtures (from Hero.test.ts "Hero — snapshot" describe block)
// ---------------------------------------------------------------------------

/**
 * Hero canonical — eyebrow + headline + subheadline + cta (NO background image).
 * Maps to: exports[`Hero — snapshot > canonical render matches snapshot 1`]
 */
export const heroCanonical: HeroProps = {
  headline: "Design Systems at Scale",
  eyebrow: "Chapter 1",
  subheadline: "Building the primitives right.",
  cta_label: "Let's go",
};

/**
 * Hero image variant — headline + background_treatment=image + image_src + image_alt.
 * Maps to: exports[`Hero — snapshot > image background variant matches snapshot 1`]
 */
export const heroImage: HeroProps = {
  headline: "With Background",
  background_treatment: "image",
  image_src: "/img/hero.jpg",
  image_alt: "Hero image",
};

// ---------------------------------------------------------------------------
// TwoUp fixtures (from TwoUp.test.ts "TwoUp — snapshot" describe block)
// ---------------------------------------------------------------------------

/**
 * TwoUp text-only — left_body + right_body; no headings; divider defaults to present.
 * Maps to: exports[`TwoUp — snapshot > canonical text-only render matches snapshot 1`]
 */
export const twoUpTextOnly: TwoUpProps = {
  left_body: "The left side story.",
  right_body: "The right side story.",
};

/**
 * TwoUp headings — both headings present, divider=false.
 * Maps to: exports[`TwoUp — snapshot > with headings and divider=false matches snapshot 1`]
 */
export const twoUpHeadings: TwoUpProps = {
  left_body: "Left body",
  right_body: "Right body",
  left_heading: "Left Title",
  right_heading: "Right Title",
  divider: false,
};

// ---------------------------------------------------------------------------
// Code fixtures (from Code.test.ts "Code — snapshot" describe block)
// ---------------------------------------------------------------------------

/**
 * Code canonical — TypeScript, heading, caption, highlight_lines=[1].
 * Maps to: exports[`Code — snapshot > canonical render matches snapshot 1`]
 */
export const codeCanonical: CodeProps = {
  code: "const greeting = 'hello';\nconsole.log(greeting);",
  language: "typescript",
  heading: "A TypeScript Example",
  caption: "Listing 1 — greeting",
  highlight_lines: [1],
};

/**
 * Code minimal — Python, no heading, no caption, no highlight_lines.
 * Maps to: exports[`Code — snapshot > minimal render (no heading, no caption, no highlight) matches snapshot 1`]
 */
export const codeMinimal: CodeProps = {
  code: "print('hello')",
  language: "python",
};

// ---------------------------------------------------------------------------
// Quote fixtures (from Quote.test.ts "Quote — snapshot" describe block)
// ---------------------------------------------------------------------------

/**
 * Quote canonical — da Vinci quote, attribution + context, emphasis=centered.
 * Maps to: exports[`Quote — snapshot > canonical render with attribution + context matches snapshot 1`]
 */
export const quoteCanonical: QuoteProps = {
  quote: "Simplicity is the ultimate sophistication.",
  attribution: "Leonardo da Vinci",
  context: "15th century",
  emphasis: "centered",
};

/**
 * Quote ruled — minimal, emphasis=ruled, no attribution/context.
 * Maps to: exports[`Quote — snapshot > ruled emphasis no figcaption matches snapshot 1`]
 */
export const quoteRuled: QuoteProps = {
  quote: "Less is more.",
  emphasis: "ruled",
};
