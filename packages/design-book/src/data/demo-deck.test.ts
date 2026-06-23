import { describe, it, expect } from "vitest";
import { DEMO_SLIDES } from "./demo-deck.js";
import type { DemoSlide } from "./demo-deck.js";
import {
  LAYOUT_IDS,
  HeroPropsSchema,
  TwoUpPropsSchema,
  CodePropsSchema,
  QuotePropsSchema,
} from "@decklee/schema";

void (null as unknown as DemoSlide);

// ── A. Structural integrity ───────────────────────────────────────────────────

describe("A — Structural integrity", () => {
  it("has exactly 17 slides", () => {
    expect(DEMO_SLIDES.length).toBe(17);
  });

  it("all slide ids are unique and non-empty", () => {
    const ids = DEMO_SLIDES.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    ids.forEach((id) => expect(id.length).toBeGreaterThan(0));
  });

  it("all layout values are in LAYOUT_IDS", () => {
    const validLayouts = new Set<string>(LAYOUT_IDS);
    DEMO_SLIDES.forEach((s) => {
      expect(validLayouts.has(s.layout), `Slide ${s.id} has invalid layout: ${s.layout}`).toBe(true);
    });
  });

  it("all slides have theme_id === \"dev\"", () => {
    DEMO_SLIDES.forEach((s) => {
      expect(s.props.theme_id).toBe("dev");
    });
  });

  it("all slides have a non-empty label", () => {
    DEMO_SLIDES.forEach((s) => {
      expect(typeof s.label).toBe("string");
      expect(s.label.length).toBeGreaterThan(0);
    });
  });
});

// ── B. Banned strings ─────────────────────────────────────────────────────────

describe("B — Banned strings", () => {
  it("no slide props contain \"(fictional design partner)\"", () => {
    DEMO_SLIDES.forEach((s) => {
      const json = JSON.stringify(s.props);
      expect(json).not.toContain("(fictional design partner)");
    });
  });

  it("no slide props contain \"lorem\"", () => {
    DEMO_SLIDES.forEach((s) => {
      const json = JSON.stringify(s.props).toLowerCase();
      expect(json).not.toContain("lorem");
    });
  });
});

// ── C. Per-layout schema validation ──────────────────────────────────────────

describe("C — Per-layout schema validation", () => {
  // Strips theme_id before passing to Zod (theme_id is not in content-props schema)
  const stripThemeId = (props: Record<string, unknown>) => {
    const { theme_id, ...rest } = props;
    void theme_id;
    return rest;
  };

  it("all Hero slides pass HeroPropsSchema", () => {
    const heroSlides = DEMO_SLIDES.filter((s) => s.layout === "hero");
    expect(heroSlides.length).toBeGreaterThan(0);
    heroSlides.forEach((s) => {
      const result = HeroPropsSchema.safeParse(stripThemeId(s.props));
      expect(result.success, `Slide ${s.id} failed HeroPropsSchema: ${JSON.stringify(result)}`).toBe(true);
    });
  });

  it("all TwoUp slides pass TwoUpPropsSchema", () => {
    const twoUpSlides = DEMO_SLIDES.filter((s) => s.layout === "two-up");
    expect(twoUpSlides.length).toBeGreaterThan(0);
    twoUpSlides.forEach((s) => {
      const result = TwoUpPropsSchema.safeParse(stripThemeId(s.props));
      expect(result.success, `Slide ${s.id} failed TwoUpPropsSchema: ${JSON.stringify(result)}`).toBe(true);
    });
  });

  it("all Code slides pass CodePropsSchema", () => {
    const codeSlides = DEMO_SLIDES.filter((s) => s.layout === "code");
    expect(codeSlides.length).toBeGreaterThan(0);
    codeSlides.forEach((s) => {
      const result = CodePropsSchema.safeParse(stripThemeId(s.props));
      expect(result.success, `Slide ${s.id} failed CodePropsSchema: ${JSON.stringify(result)}`).toBe(true);
    });
  });

  it("all Quote slides pass QuotePropsSchema", () => {
    const quoteSlides = DEMO_SLIDES.filter((s) => s.layout === "quote");
    expect(quoteSlides.length).toBeGreaterThan(0);
    quoteSlides.forEach((s) => {
      const result = QuotePropsSchema.safeParse(stripThemeId(s.props));
      expect(result.success, `Slide ${s.id} failed QuotePropsSchema: ${JSON.stringify(result)}`).toBe(true);
    });
  });
});

// ── D. Spot-checks ────────────────────────────────────────────────────────────

describe("D — Spot-checks", () => {
  it("S11 (index 10) context === \"VP Engineering, Fathom\" (no dev note)", () => {
    expect((DEMO_SLIDES[10].props as any).context).toBe("VP Engineering, Fathom");
  });

  it("S7 (index 6) right_heading is not \"Why it matters\"", () => {
    expect((DEMO_SLIDES[6].props as any).right_heading).not.toBe("Why it matters");
  });

  it("S8 (index 7) right_heading is not \"Why it matters\"", () => {
    expect((DEMO_SLIDES[7].props as any).right_heading).not.toBe("Why it matters");
  });

  it("S9 (index 8) right_heading is not \"Why it matters\"", () => {
    expect((DEMO_SLIDES[8].props as any).right_heading).not.toBe("Why it matters");
  });

  it("Quote slides (s2, s11, s14) have no literal ASCII or curly quote chars in .quote", () => {
    const quoteSlides = DEMO_SLIDES.filter((s) => s.layout === "quote");
    quoteSlides.forEach((s) => {
      const q = (s.props as any).quote as string;
      // No literal curly or ASCII quotes at any position
      expect(q).not.toMatch(/["“”'‘’]/);
    });
  });

  it("S6 (index 5) highlight_lines deep-equals [9, 10, 11]", () => {
    expect((DEMO_SLIDES[5].props as any).highlight_lines).toEqual([9, 10, 11]);
  });

  it("S1 (index 0) eyebrow === \"LUMEN\"", () => {
    expect((DEMO_SLIDES[0].props as any).eyebrow).toBe("LUMEN");
  });

  it("S17 (index 16) cta_label === \"lumen.dev/demo\"", () => {
    expect((DEMO_SLIDES[16].props as any).cta_label).toBe("lumen.dev/demo");
  });

  it("S10 (index 9) divider === false", () => {
    expect((DEMO_SLIDES[9].props as any).divider).toBe(false);
  });
});
