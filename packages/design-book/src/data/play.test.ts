/**
 * play.test.ts — Fixture integrity + build smoke gate.
 *
 * ZERO import.meta.glob (TR-1). All fixtures imported DIRECTLY as plain .ts
 * modules so vitest can execute them without Astro's Vite pipeline.
 *
 * Groups:
 *   A. Registry integrity — names unique, kebab-case, tier valid.
 *   B. Per-locked-fixture, per-variant schema validation via safeParse.
 *      stripThemeId mirrors the contentProps() helper (TR-4).
 *   C. Image variant coverage — hero 'image-bg', two-up 'image-pane'.
 *   D. Stress variant coverage — each fixture has ≥1 stress:true variant.
 *   E. Build smoke — dist/ routes (index catalog + component detail pages).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import heroFixture from "./fixtures/hero.demo.js";
import twoUpFixture from "./fixtures/two-up.demo.js";
import codeFixture from "./fixtures/code.demo.js";
import quoteFixture from "./fixtures/quote.demo.js";
import {
  HeroPropsSchema,
  TwoUpPropsSchema,
  CodePropsSchema,
  QuotePropsSchema,
} from "@decklee/schema";
import type { PlayFixture } from "./play.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url));

/** Strip theme_id before passing to the strictObject schema (TR-4). */
function stripThemeId(props: Record<string, unknown>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme_id, ...rest } = props;
  return rest;
}

const ALL_FIXTURES: PlayFixture<Record<string, unknown>>[] = [
  heroFixture as unknown as PlayFixture<Record<string, unknown>>,
  twoUpFixture as unknown as PlayFixture<Record<string, unknown>>,
  codeFixture as unknown as PlayFixture<Record<string, unknown>>,
  quoteFixture as unknown as PlayFixture<Record<string, unknown>>,
];
const LOCKED_FIXTURES = ALL_FIXTURES.filter((f) => f.tier === "locked");

const schemaMap: Record<
  string,
  { safeParse: (v: unknown) => { success: boolean; error?: { issues: unknown[] } } }
> = {
  hero: HeroPropsSchema,
  "two-up": TwoUpPropsSchema,
  code: CodePropsSchema,
  quote: QuotePropsSchema,
};

// ── A. Registry integrity ─────────────────────────────────────────────────────

describe("PlayFixture registry — structural integrity", () => {
  it("(A1) all fixture names are unique", () => {
    const names = ALL_FIXTURES.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("(A2) all fixture names are kebab-case slugs", () => {
    for (const fixture of ALL_FIXTURES) {
      expect(fixture.name, `fixture name "${fixture.name}"`).toMatch(
        /^[a-z0-9]+(-[a-z0-9]+)*$/
      );
    }
  });

  it("(A3) all fixture tiers are 'locked' or 'draft'", () => {
    for (const fixture of ALL_FIXTURES) {
      expect(["locked", "draft"], `tier for "${fixture.name}"`).toContain(fixture.tier);
    }
  });

  it("(A4) each fixture has a non-empty title", () => {
    for (const fixture of ALL_FIXTURES) {
      expect(fixture.title, `title for "${fixture.name}"`).toBeTruthy();
    }
  });

  it("(A5) each fixture has a truthy component reference", () => {
    for (const fixture of ALL_FIXTURES) {
      expect(fixture.component, `component for "${fixture.name}"`).toBeTruthy();
    }
  });

  it("(A6) each fixture has at least one variant", () => {
    for (const fixture of ALL_FIXTURES) {
      expect(
        fixture.variants.length,
        `variant count for "${fixture.name}"`
      ).toBeGreaterThanOrEqual(1);
    }
  });
});

// ── B. Per-locked-fixture, per-variant schema validation ──────────────────────

describe("Schema validation — locked fixture variants pass their primitive schema", () => {
  for (const fixture of LOCKED_FIXTURES) {
    const schema = schemaMap[fixture.name];

    describe(`${fixture.name} (${fixture.tier})`, () => {
      it(`has a schema mapping`, () => {
        expect(schema, `No schema found for fixture name "${fixture.name}"`).toBeDefined();
      });

      for (const variant of fixture.variants) {
        it(`${variant.name}${variant.stress ? " [stress]" : ""} — props pass safeParse`, () => {
          const stripped = stripThemeId(variant.props as unknown as Record<string, unknown>);
          const result = schema.safeParse(stripped);
          expect(
            result.success,
            `${fixture.name}/${variant.name} failed safeParse: ${JSON.stringify(
              (result as { success: false; error: { issues: unknown[] } }).error?.issues
            )}`
          ).toBe(true);
        });
      }
    });
  }
});

// ── C. Image variant coverage ─────────────────────────────────────────────────

describe("Image variant coverage", () => {
  it("(C1) hero 'image-bg' carries background_treatment:'image', image_src, image_alt", () => {
    const variant = heroFixture.variants.find((v) => v.name === "image-bg");
    expect(variant, "hero 'image-bg' variant not found").toBeDefined();
    const props = variant!.props as unknown as Record<string, unknown>;
    expect(props.background_treatment).toBe("image");
    expect(typeof props.image_src).toBe("string");
    expect((props.image_src as string).length).toBeGreaterThan(0);
    expect(typeof props.image_alt).toBe("string");
    expect((props.image_alt as string).length).toBeGreaterThan(0);
  });

  it("(C1b) hero 'image-bg' image_src references /img/placeholder.svg", () => {
    const variant = heroFixture.variants.find((v) => v.name === "image-bg")!;
    const props = variant.props as unknown as Record<string, unknown>;
    expect(props.image_src).toBe("/img/placeholder.svg");
  });

  it("(C2) two-up 'image-pane' carries left_type:'image', left_image_src, left_image_alt", () => {
    const variant = twoUpFixture.variants.find((v) => v.name === "image-pane");
    expect(variant, "two-up 'image-pane' variant not found").toBeDefined();
    const props = variant!.props as unknown as Record<string, unknown>;
    expect(props.left_type).toBe("image");
    expect(typeof props.left_image_src).toBe("string");
    expect((props.left_image_src as string).length).toBeGreaterThan(0);
    expect(typeof props.left_image_alt).toBe("string");
    expect((props.left_image_alt as string).length).toBeGreaterThan(0);
  });

  it("(C2b) two-up 'image-pane' left_image_src references /img/placeholder.svg", () => {
    const variant = twoUpFixture.variants.find((v) => v.name === "image-pane")!;
    const props = variant.props as unknown as Record<string, unknown>;
    expect(props.left_image_src).toBe("/img/placeholder.svg");
  });
});

// ── D. Stress variant coverage ────────────────────────────────────────────────

describe("Stress variant coverage — each locked fixture has an overflow case", () => {
  for (const fixture of LOCKED_FIXTURES) {
    it(`${fixture.name} has at least one variant with stress === true`, () => {
      const hasStress = fixture.variants.some((v) => v.stress === true);
      expect(hasStress, `${fixture.name}: no stress variant found`).toBe(true);
    });
  }
});

// ── E. Build smoke — dist/ routes ─────────────────────────────────────────────
//
// Reads dist files via node:fs readFileSync. If dist/ is missing, tests are
// skipped with a descriptive message (mirrors the design-book-data.test.ts pattern).
//
// NOTE: /play routes have been eliminated (unify-book-play). The catalog now
// lives at dist/index.html and the harness pages at dist/component/<name>/index.html.

describe("Build smoke — dist/index.html (catalog)", () => {
  const catalogPath = resolve(HERE, "../../dist/index.html");
  let html = "";

  beforeAll(() => {
    try {
      html = readFileSync(catalogPath, "utf8");
    } catch {
      html = "";
    }
  });

  it("(E1) dist/index.html exists and is non-empty", () => {
    expect(
      html.length,
      "dist/index.html is missing or empty — run pnpm build first"
    ).toBeGreaterThan(0);
  });

  it("(E2) contains focus links to /component/hero, /component/two-up, /component/code, /component/quote", () => {
    expect(html).toContain("/component/hero");
    expect(html).toContain("/component/two-up");
    expect(html).toContain("/component/code");
    expect(html).toContain("/component/quote");
  });

  it("(E2b) fixture links appear in canonical order: hero, two-up, code, quote", () => {
    const heroIdx = html.indexOf("/component/hero");
    const twoUpIdx = html.indexOf("/component/two-up");
    const codeIdx = html.indexOf("/component/code");
    const quoteIdx = html.indexOf("/component/quote");
    expect(heroIdx, "hero before two-up").toBeLessThan(twoUpIdx);
    expect(twoUpIdx, "two-up before code").toBeLessThan(codeIdx);
    expect(codeIdx, "code before quote").toBeLessThan(quoteIdx);
  });

  it('(E3) sidebar contains "Primitives" group label (replaces removed landing heading)', () => {
    // "Four locked layouts" LandingSection heading was removed with the Home rewrite.
    // The BookShell sidebar renders a "Primitives" group label on every page including index.html.
    expect(html).toContain("Primitives");
  });

  it('(E3b) sidebar contains "Drafts" group label', () => {
    // "Drafts" is now the sidebar <summary> group label rendered by BookShell on every page.
    expect(html).toContain("Drafts");
  });

  it('(E3c) does NOT contain class="reveal" — book is not a deck', () => {
    expect(html).not.toMatch(/class="reveal"/);
  });

  it("(E3d) does NOT contain any href to /play", () => {
    expect(html).not.toMatch(/href="\/play/);
  });
});

describe("Build smoke — dist/component/hero/index.html (harness page)", () => {
  const heroComponentPath = resolve(HERE, "../../dist/component/hero/index.html");
  let html = "";

  beforeAll(() => {
    try {
      html = readFileSync(heroComponentPath, "utf8");
    } catch {
      html = "";
    }
  });

  it("(E4) dist/component/hero/index.html exists and is non-empty", () => {
    expect(
      html.length,
      "dist/component/hero/index.html is missing or empty — run pnpm build first"
    ).toBeGreaterThan(0);
  });

  it("(E5) contains 'dk-stage' class (PrimitiveStage rendered)", () => {
    expect(html).toContain("dk-stage");
  });

  it('(E6) does NOT contain class="reveal"', () => {
    expect(html).not.toMatch(/class="reveal"/);
  });

  it("(E7) contains stress marker for the overflow variant (dk-component-stress or STRESS)", () => {
    const hasStressClass = html.includes("dk-component-stress");
    const hasStressBadge = html.includes("STRESS");
    expect(
      hasStressClass || hasStressBadge,
      "Expected dk-component-stress class or STRESS badge for the overflow variant"
    ).toBe(true);
  });

  it("(E8) renders all 4 variant cells (≥4 'Live preview:' aria-labels)", () => {
    const matches = html.match(/aria-label="Live preview:/g) ?? [];
    expect(
      matches.length,
      `Expected ≥4 'Live preview:' aria-labels (one per hero variant), got ${matches.length}`
    ).toBeGreaterThanOrEqual(4);
  });
});

describe("Build smoke — dist/component sub-routes all exist", () => {
  const routes = ["two-up", "code", "quote"];

  for (const name of routes) {
    it(`dist/component/${name}/index.html exists and is non-empty`, () => {
      const path = resolve(HERE, `../../dist/component/${name}/index.html`);
      let html = "";
      try {
        html = readFileSync(path, "utf8");
      } catch {
        html = "";
      }
      expect(
        html.length,
        `dist/component/${name}/index.html is missing or empty — run pnpm build first`
      ).toBeGreaterThan(0);
    });
  }
});

describe("Build smoke — dist/play/ is absent (routes eliminated)", () => {
  it("(E-play) dist/play/index.html does NOT exist after build", () => {
    const playIndexPath = resolve(HERE, "../../dist/play/index.html");
    expect(
      existsSync(playIndexPath),
      "dist/play/index.html still exists — /play route was not eliminated"
    ).toBe(false);
  });
});

// ── F. Build smoke — new BookShell routes ─────────────────────────────────────

describe("Build smoke — dist/foundations/color/index.html exists (F1)", () => {
  it("(F1) exists and is non-empty", () => {
    const path = resolve(HERE, "../../dist/foundations/color/index.html");
    let html = "";
    try {
      html = readFileSync(path, "utf8");
    } catch {
      html = "";
    }
    expect(
      html.length,
      "dist/foundations/color/index.html is missing — run pnpm build first"
    ).toBeGreaterThan(0);
  });
});

describe("Build smoke — dist/foundations/typography/index.html exists (F2)", () => {
  it("(F2) exists and is non-empty", () => {
    const path = resolve(HERE, "../../dist/foundations/typography/index.html");
    let html = "";
    try {
      html = readFileSync(path, "utf8");
    } catch {
      html = "";
    }
    expect(
      html.length,
      "dist/foundations/typography/index.html is missing — run pnpm build first"
    ).toBeGreaterThan(0);
  });
});

describe("Build smoke — dist/foundations/spacing/index.html exists (F3)", () => {
  it("(F3) exists and is non-empty", () => {
    const path = resolve(HERE, "../../dist/foundations/spacing/index.html");
    let html = "";
    try {
      html = readFileSync(path, "utf8");
    } catch {
      html = "";
    }
    expect(
      html.length,
      "dist/foundations/spacing/index.html is missing — run pnpm build first"
    ).toBeGreaterThan(0);
  });
});

describe("Build smoke — dist/themes/index.html exists (F4)", () => {
  it("(F4) exists and is non-empty", () => {
    const path = resolve(HERE, "../../dist/themes/index.html");
    let html = "";
    try {
      html = readFileSync(path, "utf8");
    } catch {
      html = "";
    }
    expect(
      html.length,
      "dist/themes/index.html is missing — run pnpm build first"
    ).toBeGreaterThan(0);
  });
});

describe("Build smoke — dist/rule/index.html exists (F5)", () => {
  it("(F5) exists and is non-empty", () => {
    const path = resolve(HERE, "../../dist/rule/index.html");
    let html = "";
    try {
      html = readFileSync(path, "utf8");
    } catch {
      html = "";
    }
    expect(
      html.length,
      "dist/rule/index.html is missing — run pnpm build first"
    ).toBeGreaterThan(0);
  });
});
