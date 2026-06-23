/**
 * design-book-data.test.ts — Schema validation + structural integrity for the
 * authored story corpus and build smoke gate.
 *
 * Tests are organised into five groups:
 *   1. Story corpus integrity (uniqueness, layout coverage, sections).
 *   2. Per-primitive schema validation via @decklee/schema safeParse.
 *      (Primitive-variant coverage moved to play.test.ts; only editorial
 *       stories with primitive !== null remain here.)
 *   3. Build smoke gate — dist/index.html (LANDING PAGE, no reveal):
 *      asserts landmark structure, 5 section anchors, live primitive roots,
 *      skip link, data-theme="dev", absence of .reveal and print-section content,
 *      and PrimitiveStage aria-hidden inner / aria-label outer contract.
 *   4. Build smoke gate — dist/demo/index.html (DECK):
 *      asserts reveal root, slides container, deck sections, back-link to "/".
 *
 * NOTE: Image story constraints (hero-story-c / twoup-story-c) and the
 * "≥3 variants per primitive" assertion were REMOVED — those stories migrated
 * to src/data/fixtures/*.demo.ts; equivalent coverage lives in play.test.ts.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  STORIES,
  SECTIONS,
  type DesignBookStory,
} from "./design-book.js";
import {
  HeroPropsSchema,
  TwoUpPropsSchema,
  CodePropsSchema,
  QuotePropsSchema,
  LAYOUT_IDS,
} from "@decklee/schema";

// ── Helpers ───────────────────────────────────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url));

/** Strip theme_id from props before passing to the strictObject schema. */
function contentProps(story: DesignBookStory): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme_id, ...rest } = story.props as Record<string, unknown>;
  return rest;
}

const schemaForLayout: Record<
  string,
  { safeParse: (v: unknown) => { success: boolean; error?: { issues: unknown[] } } }
> = {
  hero: HeroPropsSchema,
  "two-up": TwoUpPropsSchema,
  code: CodePropsSchema,
  quote: QuotePropsSchema,
};

// ── 1. Story corpus integrity ─────────────────────────────────────────────────

describe("STORIES — structural integrity", () => {
  it("has 13–17 editorial stories (12 primitive-variant stories migrated to fixtures)", () => {
    expect(STORIES.length).toBeGreaterThanOrEqual(13);
    expect(STORIES.length).toBeLessThanOrEqual(17);
  });

  it("all story ids are unique", () => {
    const ids = STORIES.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("all story ids are non-empty kebab-case slugs (URL-safe)", () => {
    for (const story of STORIES) {
      expect(story.id, `id for "${story.section}"`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("all story layout values are in LAYOUT_IDS", () => {
    const validLayouts = new Set<string>(LAYOUT_IDS);
    for (const story of STORIES) {
      expect(validLayouts.has(story.layout), `layout "${story.layout}" for "${story.id}"`).toBe(
        true
      );
    }
  });

  it("every primitive story carries theme_id:'dev'", () => {
    for (const story of STORIES) {
      if (story.primitive !== null) {
        const props = story.props as Record<string, unknown>;
        expect(props.theme_id, `theme_id for "${story.id}"`).toBe("dev");
      }
    }
  });

  it("section-opener stories (primitive:null) also carry theme_id:'dev' for the hero shell", () => {
    for (const story of STORIES) {
      if (story.primitive === null) {
        const props = story.props as Record<string, unknown>;
        expect(props.theme_id, `opener theme_id for "${story.id}"`).toBe("dev");
      }
    }
  });

  it("end card story with id 'end' exists", () => {
    const end = STORIES.find((s) => s.id === "end");
    expect(end).toBeDefined();
    expect((end!.props as Record<string, unknown>).headline).toContain("That's the system");
  });

  // NOTE: "each primitive ≥3 times" assertion removed — the 12 primitive-variant
  // stories migrated to src/data/fixtures/*.demo.ts. Per-variant coverage now
  // lives in play.test.ts (Groups B + C + D).
});

// ── 1b. SECTIONS derived correctly ─────────────────────────────────────────────

describe("SECTIONS — rail model", () => {
  it("every section id maps to a valid sectionId in STORIES", () => {
    const storySectionIds = new Set(STORIES.map((s) => s.sectionId));
    for (const section of SECTIONS) {
      expect(storySectionIds.has(section.id), `section id "${section.id}"`).toBe(true);
    }
  });

  it("every section firstSlideIndex is a valid STORIES index", () => {
    for (const section of SECTIONS) {
      expect(section.firstSlideIndex, `${section.id} firstSlideIndex`).toBeGreaterThanOrEqual(0);
      expect(section.firstSlideIndex, `${section.id} firstSlideIndex`).toBeLessThan(
        STORIES.length
      );
    }
  });

  it("cover section is the first in the rail (index 0)", () => {
    const cover = SECTIONS.find((s) => s.id === "cover");
    expect(cover).toBeDefined();
    expect(cover!.firstSlideIndex).toBe(0);
  });
});

// ── 2. Per-primitive schema validation (content_props sans theme_id) ──────────

describe("Schema validation — content_props pass their primitive schema", () => {
  const primitiveStories = STORIES.filter((s) => s.primitive !== null);

  for (const story of primitiveStories) {
    it(`${story.id} (${story.primitive}) — content_props pass safeParse`, () => {
      const schema = schemaForLayout[story.primitive!];
      expect(schema, `No schema for layout "${story.primitive}"`).toBeDefined();
      const result = schema.safeParse(contentProps(story));
      expect(
        result.success,
        `${story.id} failed: ${JSON.stringify((result as { success: false; error: { issues: unknown[] } }).error?.issues)}`
      ).toBe(true);
    });
  }
});

// NOTE: Group 4 (Image story constraints for hero-story-c / twoup-story-c) was
// REMOVED — those story ids no longer exist in STORIES[]. Equivalent image-variant
// coverage now lives in play.test.ts (Group C: image variant coverage).

// ── 3. Build smoke gate — dist/index.html (BookShell HOME, no reveal) ────────
//
// The `/` route is now a BookShell Home page (cover headline + QuickLinksGrid +
// persistent sidebar). It must NOT contain any reveal.js artefacts, <header>,
// <footer>, the old LandingSection anchors, or PrimitiveStage/DeckDemoCard.
// It MUST contain the BookShell sidebar nav, cover headline, QuickLinks.

describe("Build smoke — dist/index.html (BookShell Home, NO reveal)", () => {
  const distPath = resolve(HERE, "../../dist/index.html");
  let html = "";

  beforeAll(() => {
    try {
      html = readFileSync(distPath, "utf8");
    } catch {
      // If the file is missing we set html = '' and each test will fail with a
      // meaningful message. We do NOT skip silently — missing dist is a gate failure.
      html = "";
    }
  });

  it("dist/index.html exists and is non-empty", () => {
    expect(html.length, "dist/index.html is missing or empty — run pnpm build first").toBeGreaterThan(0);
  });

  // ── No reveal artefacts ───────────────────────────────────────────────────

  it("does NOT contain class=\"reveal\" — landing is not a deck", () => {
    expect(html).not.toMatch(/class="reveal"/);
  });

  it("does NOT contain class=\"slides\" — no reveal slide container", () => {
    expect(html).not.toContain('class="slides"');
  });

  it("does NOT contain any <section data-id> deck slides", () => {
    const matches = html.match(/<section data-id="/g) ?? [];
    expect(
      matches.length,
      `Landing should have 0 <section data-id> elements, got ${matches.length}`
    ).toBe(0);
  });

  it("does NOT contain print-section content (scale-demo / print-instructions)", () => {
    expect(html).not.toContain("scale-demo");
    expect(html).not.toContain("print-instructions");
  });

  // ── Landmark structure ────────────────────────────────────────────────────

  it("contains data-theme=\"dev\"", () => {
    expect(html).toContain('data-theme="dev"');
  });

  it("contains <main id=\"main-content\">", () => {
    expect(html).toContain('id="main-content"');
  });

  it("skip link with href=\"#main-content\" is present", () => {
    expect(html).toContain('href="#main-content"');
    // BookShell renders class="dk-skip sr-only" (both classes present)
    expect(html).toContain('class="dk-skip');
  });

  // ── BookShell sidebar ─────────────────────────────────────────────────────

  it("contains <aside> landmark (sidebar)", () => {
    expect(html).toContain("<aside");
  });

  it("contains <nav aria-label=\"Design Book\"> (sidebar nav)", () => {
    expect(html).toContain('aria-label="Design Book"');
  });

  it("sidebar contains link to /component/hero", () => {
    expect(html).toContain("/component/hero");
  });

  it("sidebar contains link to /component/two-up", () => {
    expect(html).toContain("/component/two-up");
  });

  it("sidebar contains link to /component/code", () => {
    expect(html).toContain("/component/code");
  });

  it("sidebar contains link to /component/quote", () => {
    expect(html).toContain("/component/quote");
  });

  it("sidebar contains Foundations group label", () => {
    expect(html).toContain("Foundations");
  });

  it("sidebar contains Color leaf link (/foundations/color)", () => {
    expect(html).toContain("/foundations/color");
  });

  it("sidebar contains Typography leaf link (/foundations/typography)", () => {
    expect(html).toContain("/foundations/typography");
  });

  it("sidebar contains Spacing leaf link (/foundations/spacing)", () => {
    expect(html).toContain("/foundations/spacing");
  });

  it("sidebar contains a <details> group (Foundations collapsible group rendered)", () => {
    expect(html).toContain("<details");
  });

  it("sidebar Drafts group label is present", () => {
    expect(html).toContain("Drafts");
  });

  // ── Home content (cover + QuickLinksGrid) ─────────────────────────────────

  it("contains cover headline text", () => {
    // STORIES 'cover' props.headline resolves to this string at build time
    expect(html).toContain("Ship the contract, not the chaos.");
  });

  it("QuickLinksGrid: contains /foundations/color link", () => {
    expect(html).toContain("/foundations/color");
  });

  it("QuickLinksGrid: contains /themes link", () => {
    expect(html).toContain("/themes");
  });

  it("QuickLinksGrid: contains /rule link", () => {
    expect(html).toContain("/rule");
  });

  // ── Removed elements (asserting OLD landing is gone) ─────────────────────

  it("does NOT contain dk-demo (DeckDemoCard class — retired)", () => {
    expect(html).not.toContain("dk-demo");
  });

  it("does NOT contain dk-play-crossnav", () => {
    expect(html).not.toContain("dk-play-crossnav");
  });

  it("does not contain a <noscript> redirect or error-substitution block", () => {
    expect(html).not.toMatch(/<noscript>[^<]*window\.location/);
  });
});

// ── 3b. Build smoke — dist/foundations/color/index.html ──────────────────────

describe("Build smoke — dist/foundations/color/index.html", () => {
  const foundationColorPath = resolve(HERE, "../../dist/foundations/color/index.html");
  let html = "";

  beforeAll(() => {
    try {
      html = readFileSync(foundationColorPath, "utf8");
    } catch {
      html = "";
    }
  });

  it("exists and is non-empty", () => {
    expect(html.length, "dist/foundations/color/index.html is missing — run pnpm build first").toBeGreaterThan(0);
  });

  it("contains FoundationSection content (dk-foundation class)", () => {
    expect(html).toContain("dk-foundation");
  });

  it("contains the sidebar nav (BookShell present)", () => {
    expect(html).toContain('aria-label="Design Book"');
  });

  it("contains color-specific content (dk-swatch or color token)", () => {
    expect(html).toContain("dk-swatch");
  });
});

// ── 3c. Build smoke — dist/foundations/typography/index.html ─────────────────

describe("Build smoke — dist/foundations/typography/index.html", () => {
  const foundationTypoPath = resolve(HERE, "../../dist/foundations/typography/index.html");
  let html = "";

  beforeAll(() => {
    try {
      html = readFileSync(foundationTypoPath, "utf8");
    } catch {
      html = "";
    }
  });

  it("exists and is non-empty", () => {
    expect(html.length, "dist/foundations/typography/index.html is missing — run pnpm build first").toBeGreaterThan(0);
  });

  it("contains FoundationSection content (dk-foundation class)", () => {
    expect(html).toContain("dk-foundation");
  });

  it("contains the sidebar nav (BookShell present)", () => {
    expect(html).toContain('aria-label="Design Book"');
  });
});

// ── 3d. Build smoke — dist/foundations/spacing/index.html ────────────────────

describe("Build smoke — dist/foundations/spacing/index.html", () => {
  const foundationSpacingPath = resolve(HERE, "../../dist/foundations/spacing/index.html");
  let html = "";

  beforeAll(() => {
    try {
      html = readFileSync(foundationSpacingPath, "utf8");
    } catch {
      html = "";
    }
  });

  it("exists and is non-empty", () => {
    expect(html.length, "dist/foundations/spacing/index.html is missing — run pnpm build first").toBeGreaterThan(0);
  });

  it("contains FoundationSection content (dk-foundation class)", () => {
    expect(html).toContain("dk-foundation");
  });

  it("contains the sidebar nav (BookShell present)", () => {
    expect(html).toContain('aria-label="Design Book"');
  });
});

// ── 3e. Build smoke — dist/themes/index.html ─────────────────────────────────

describe("Build smoke — dist/themes/index.html", () => {
  const themesPath = resolve(HERE, "../../dist/themes/index.html");
  let html = "";

  beforeAll(() => {
    try {
      html = readFileSync(themesPath, "utf8");
    } catch {
      html = "";
    }
  });

  it("exists and is non-empty", () => {
    expect(html.length, "dist/themes/index.html is missing — run pnpm build first").toBeGreaterThan(0);
  });

  it("contains ThemeContributorBlock markup (dk-contrib class)", () => {
    expect(html).toContain("dk-contrib");
  });

  it("contains the sidebar nav (BookShell present)", () => {
    expect(html).toContain('aria-label="Design Book"');
  });
});

// ── 3f. Build smoke — dist/rule/index.html ───────────────────────────────────

describe("Build smoke — dist/rule/index.html", () => {
  const rulePath = resolve(HERE, "../../dist/rule/index.html");
  let html = "";

  beforeAll(() => {
    try {
      html = readFileSync(rulePath, "utf8");
    } catch {
      html = "";
    }
  });

  it("exists and is non-empty", () => {
    expect(html.length, "dist/rule/index.html is missing — run pnpm build first").toBeGreaterThan(0);
  });

  it("contains PrimitiveStage (dk-stage class)", () => {
    expect(html).toContain("dk-stage");
  });

  it("contains dk-quote (Quote primitive rendered)", () => {
    expect(html).toContain("dk-quote");
  });

  it("contains the sidebar nav (BookShell present)", () => {
    expect(html).toContain('aria-label="Design Book"');
  });
});

// ── 4. Build smoke gate — dist/demo/index.html (DECK, reveal) ────────────────
//
// The `/demo` route is the Lumen sales deck (17 slides).
// It MUST have the reveal root, the slides container, deck sections, and the
// keyboard-reachable back-link to "/" that lets users return to the landing.

describe("Build smoke — dist/demo/index.html (deck, WITH reveal)", () => {
  const demoPath = resolve(HERE, "../../dist/demo/index.html");
  let html = "";

  beforeAll(() => {
    try {
      html = readFileSync(demoPath, "utf8");
    } catch {
      html = "";
    }
  });

  it("dist/demo/index.html exists and is non-empty", () => {
    expect(html.length, "dist/demo/index.html is missing or empty — run pnpm build first").toBeGreaterThan(0);
  });

  it("contains class=\"reveal\" root element", () => {
    expect(html).toMatch(/class="reveal"/);
  });

  it("contains class=\"slides\" inside the reveal root", () => {
    expect(html).toContain('class="slides"');
  });

  it("contains 17 <section data-id> deck slides", () => {
    const matches = html.match(/<section data-id="/g) ?? [];
    expect(
      matches.length,
      `Expected 17 <section data-id> elements in demo, got ${matches.length}`
    ).toBe(17);
  });

  it("contains the back-link href=\"/\" (← Back to the book)", () => {
    expect(html).toContain('href="/"');
  });

  it("contains all 4 dk-* primitive root classes (hero, twoup, code, quote)", () => {
    expect(html).toContain("dk-hero");
    expect(html).toContain("dk-twoup");
    expect(html).toContain("dk-code");
    expect(html).toContain("dk-quote");
  });

  it("does not contain a <noscript> redirect or error-substitution block", () => {
    expect(html).not.toMatch(/<noscript>[^<]*window\.location/);
  });
});
