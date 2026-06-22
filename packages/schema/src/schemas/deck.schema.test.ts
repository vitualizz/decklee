import { describe, it, expect } from "vitest";
import { DeckSchema } from "./deck.schema.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function deckMeta(overrides?: Record<string, unknown>) {
  return {
    title: "Test Deck",
    theme_id: "theme-default",
    source_outline_id: null,
    ...overrides,
  };
}

function heroSlide(contentPropsOverrides?: Record<string, unknown>, slideOverrides?: Record<string, unknown>) {
  return {
    id: "slide-hero-1",
    layout: "hero",
    content_props: {
      headline: "Welcome",
      ...contentPropsOverrides,
    },
    speaker_notes: null,
    ...slideOverrides,
  };
}

function twoUpSlide(contentPropsOverrides?: Record<string, unknown>) {
  return {
    id: "slide-twoup-1",
    layout: "two-up",
    content_props: {
      left_body: "Left side content",
      right_body: "Right side content",
      ...contentPropsOverrides,
    },
    speaker_notes: null,
  };
}

function codeSlide(contentPropsOverrides?: Record<string, unknown>) {
  return {
    id: "slide-code-1",
    layout: "code",
    content_props: {
      code: 'const x = 1;',
      language: "typescript",
      ...contentPropsOverrides,
    },
    speaker_notes: null,
  };
}

function quoteSlide(contentPropsOverrides?: Record<string, unknown>) {
  return {
    id: "slide-quote-1",
    layout: "quote",
    content_props: {
      quote: "The best code is no code at all.",
      ...contentPropsOverrides,
    },
    speaker_notes: null,
  };
}

function minimalDeck(slides?: unknown[]) {
  return {
    schema_version: "1",
    kind: "deck",
    id: "deck-001",
    meta: deckMeta(),
    slides: slides ?? [],
  };
}

// ---------------------------------------------------------------------------
// Happy Path — all four layouts
// ---------------------------------------------------------------------------

describe("DeckSchema — happy path per layout", () => {
  it("accepts an empty slides deck", () => {
    const result = DeckSchema.safeParse(minimalDeck());
    expect(result.success).toBe(true);
  });

  it("accepts a hero slide with only the required headline", () => {
    const result = DeckSchema.safeParse(minimalDeck([heroSlide()]));
    expect(result.success).toBe(true);
  });

  it("accepts a hero slide with all optional props populated", () => {
    const result = DeckSchema.safeParse(
      minimalDeck([
        heroSlide({
          subheadline: "The sub",
          eyebrow: "Eyebrow text",
          background_treatment: "color",
          cta_label: "Learn More",
        }),
      ]),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a hero slide with background_treatment=image + image_src + image_alt", () => {
    const result = DeckSchema.safeParse(
      minimalDeck([
        heroSlide({
          background_treatment: "image",
          image_src: "https://example.com/bg.jpg",
          image_alt: "Descriptive alt text",
        }),
      ]),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a two-up slide with only required fields", () => {
    const result = DeckSchema.safeParse(minimalDeck([twoUpSlide()]));
    expect(result.success).toBe(true);
  });

  it("accepts a two-up slide with image pairs on both sides", () => {
    const result = DeckSchema.safeParse(
      minimalDeck([
        twoUpSlide({
          left_type: "image",
          left_image_src: "https://example.com/left.jpg",
          left_image_alt: "Left image",
          right_type: "image",
          right_image_src: "https://example.com/right.jpg",
          right_image_alt: "Right image",
        }),
      ]),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a code slide with required fields", () => {
    const result = DeckSchema.safeParse(minimalDeck([codeSlide()]));
    expect(result.success).toBe(true);
  });

  it("accepts a code slide with highlight_lines containing valid positive integers", () => {
    const result = DeckSchema.safeParse(
      minimalDeck([codeSlide({ highlight_lines: [1, 3, 5] })]),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a quote slide with only the required quote field", () => {
    const result = DeckSchema.safeParse(minimalDeck([quoteSlide()]));
    expect(result.success).toBe(true);
  });

  it("accepts a quote slide with all valid emphasis values", () => {
    const emphasisValues = ["full", "centered", "ruled"] as const;
    for (const emphasis of emphasisValues) {
      const result = DeckSchema.safeParse(
        minimalDeck([quoteSlide({ emphasis })]),
      );
      expect(result.success, `Expected emphasis "${emphasis}" to pass`).toBe(true);
    }
  });

  it("accepts a deck with all 4 layouts present", () => {
    const result = DeckSchema.safeParse(
      minimalDeck([heroSlide(), twoUpSlide(), codeSlide(), quoteSlide()]),
    );
    expect(result.success).toBe(true);
  });

  it("accepts speaker_notes as null", () => {
    const result = DeckSchema.safeParse(
      minimalDeck([{ ...heroSlide(), speaker_notes: null }]),
    );
    expect(result.success).toBe(true);
  });

  it("accepts speaker_notes as a string", () => {
    const result = DeckSchema.safeParse(
      minimalDeck([{ ...heroSlide(), speaker_notes: "Say something interesting here" }]),
    );
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Closed layout enum
// ---------------------------------------------------------------------------

describe("DeckSchema — closed layout enum", () => {
  it("rejects unknown layout value 'banner'", () => {
    const deck = minimalDeck([
      { id: "slide-1", layout: "banner", content_props: {}, speaker_notes: null },
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it("rejects unknown layout value 'full-bleed'", () => {
    const deck = minimalDeck([
      { id: "slide-1", layout: "full-bleed", content_props: {}, speaker_notes: null },
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it("rejects a slide with no layout field", () => {
    const deck = minimalDeck([
      { id: "slide-1", content_props: { headline: "Hi" }, speaker_notes: null },
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// theme_id placement
// ---------------------------------------------------------------------------

describe("DeckSchema — theme_id placement", () => {
  it("accepts theme_id only at deck.meta", () => {
    const deck = minimalDeck([heroSlide()]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.meta.theme_id).toBe("theme-default");
    }
  });

  it("rejects theme_id inside hero content_props (strictObject)", () => {
    const deck = minimalDeck([
      heroSlide({ theme_id: "sneaked-theme" }),
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it("rejects theme_id inside code content_props (strictObject)", () => {
    const deck = minimalDeck([
      codeSlide({ theme_id: "sneaked-theme" }),
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it("rejects theme_id inside quote content_props (strictObject)", () => {
    const deck = minimalDeck([
      quoteSlide({ theme_id: "sneaked-theme" }),
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hero — image_src / image_alt conditional pairing
// ---------------------------------------------------------------------------

describe("DeckSchema — Hero image_src/image_alt conditional pairing", () => {
  it("rejects background_treatment='image' without image_src (named error)", () => {
    const deck = minimalDeck([
      heroSlide({ background_treatment: "image" }),
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("image_src"));
      expect(issue, "Expected named issue on image_src path").toBeDefined();
    }
  });

  it("rejects image_src present but image_alt missing (named error)", () => {
    const deck = minimalDeck([
      heroSlide({ image_src: "https://example.com/img.jpg" }),
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("image_alt"));
      expect(issue, "Expected named issue on image_alt path").toBeDefined();
    }
  });

  it("accepts background_treatment='image' with both image_src and image_alt", () => {
    const deck = minimalDeck([
      heroSlide({
        background_treatment: "image",
        image_src: "https://example.com/img.jpg",
        image_alt: "An image",
      }),
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(true);
  });

  it("accepts background_treatment='color' without image_src", () => {
    const deck = minimalDeck([
      heroSlide({ background_treatment: "color" }),
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TwoUp — image_src / image_alt conditional pairing
// ---------------------------------------------------------------------------

describe("DeckSchema — TwoUp image pair conditionals", () => {
  it("rejects left_type='image' without left_image_src (named error)", () => {
    const deck = minimalDeck([twoUpSlide({ left_type: "image" })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("left_image_src"));
      expect(issue, "Expected named issue on left_image_src").toBeDefined();
    }
  });

  it("rejects left_image_src without left_image_alt (named error)", () => {
    const deck = minimalDeck([
      twoUpSlide({ left_image_src: "https://example.com/left.jpg" }),
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("left_image_alt"));
      expect(issue, "Expected named issue on left_image_alt").toBeDefined();
    }
  });

  it("rejects right_type='image' without right_image_src (named error)", () => {
    const deck = minimalDeck([twoUpSlide({ right_type: "image" })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("right_image_src"));
      expect(issue, "Expected named issue on right_image_src").toBeDefined();
    }
  });

  it("rejects right_image_src without right_image_alt (named error)", () => {
    const deck = minimalDeck([
      twoUpSlide({ right_image_src: "https://example.com/right.jpg" }),
    ]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("right_image_alt"));
      expect(issue, "Expected named issue on right_image_alt").toBeDefined();
    }
  });

  it("accepts left_type='text' without image fields", () => {
    const deck = minimalDeck([twoUpSlide({ left_type: "text" })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(true);
  });

  it("accepts left_type='stat' without image fields", () => {
    const deck = minimalDeck([twoUpSlide({ left_type: "stat" })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Code slide — highlight_lines validation
// ---------------------------------------------------------------------------

describe("DeckSchema — Code highlight_lines", () => {
  it("rejects highlight_lines containing 0 (min 1)", () => {
    const deck = minimalDeck([codeSlide({ highlight_lines: [0, 1, 2] })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it("rejects highlight_lines containing a negative integer", () => {
    const deck = minimalDeck([codeSlide({ highlight_lines: [-1, 2] })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it("rejects highlight_lines containing a fractional number (2.5)", () => {
    const deck = minimalDeck([codeSlide({ highlight_lines: [1, 2.5, 3] })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it("accepts highlight_lines [1, 3, 5] (valid positive integers)", () => {
    const deck = minimalDeck([codeSlide({ highlight_lines: [1, 3, 5] })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(true);
  });

  it("accepts highlight_lines as undefined (optional)", () => {
    const deck = minimalDeck([codeSlide()]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(true);
  });

  it("accepts highlight_lines [1] (single line)", () => {
    const deck = minimalDeck([codeSlide({ highlight_lines: [1] })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Quote slide — emphasis enum
// ---------------------------------------------------------------------------

describe("DeckSchema — Quote emphasis enum", () => {
  it("rejects unknown emphasis value", () => {
    const deck = minimalDeck([quoteSlide({ emphasis: "italic" })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it("accepts valid emphasis 'full'", () => {
    const deck = minimalDeck([quoteSlide({ emphasis: "full" })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Per-layout content_props — strictObject rejects unknown keys
// ---------------------------------------------------------------------------

describe("DeckSchema — per-layout content_props strictObject", () => {
  it("rejects extra unknown key in hero content_props", () => {
    const deck = minimalDeck([heroSlide({ unknown_key: "nope" })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it("rejects extra unknown key in two-up content_props", () => {
    const deck = minimalDeck([twoUpSlide({ unknown_key: "nope" })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it("rejects extra unknown key in code content_props", () => {
    const deck = minimalDeck([codeSlide({ unknown_key: "nope" })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });

  it("rejects extra unknown key in quote content_props", () => {
    const deck = minimalDeck([quoteSlide({ unknown_key: "nope" })]);
    const result = DeckSchema.safeParse(deck);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// schema_version + kind literals
// ---------------------------------------------------------------------------

describe("DeckSchema — root literals", () => {
  it("rejects wrong schema_version", () => {
    const result = DeckSchema.safeParse({ ...minimalDeck(), schema_version: "2" });
    expect(result.success).toBe(false);
  });

  it("rejects wrong kind", () => {
    const result = DeckSchema.safeParse({ ...minimalDeck(), kind: "outline" });
    expect(result.success).toBe(false);
  });
});
