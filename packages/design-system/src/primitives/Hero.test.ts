/**
 * Container API tests for Hero.astro.
 *
 * Asserts: semantic root element, data-layout, heading, conditional optional
 * elements (eyebrow, subheadline, cta), background image, zero inline styles,
 * no literal color values, a11y, and snapshot parity.
 */
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Hero from "./Hero.astro";

const NO_STYLE_ATTR = /style\s*=/i;
const NO_RAW_COLOR = /oklch\(|rgb\(|#[0-9a-f]{3,8}/i;

async function renderHero(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Hero, { props });
}

// ---------------------------------------------------------------------------
// Structural
// ---------------------------------------------------------------------------

describe("Hero — structure", () => {
  it("renders a <section> with data-layout='hero'", async () => {
    const html = await renderHero({ headline: "Test Headline", theme_id: "dev" });
    expect(html).toContain('data-layout="hero"');
    expect(html).toContain("<section");
  });

  it("renders an <h1> containing the headline text", async () => {
    const html = await renderHero({ headline: "My Slide Headline", theme_id: "dev" });
    expect(html).toContain("<h1");
    expect(html).toContain("My Slide Headline");
  });
});

// ---------------------------------------------------------------------------
// Optional elements
// ---------------------------------------------------------------------------

describe("Hero — optional elements", () => {
  it("eyebrow prop present → element with class dk-hero__eyebrow is rendered", async () => {
    const html = await renderHero({ headline: "H", eyebrow: "Chapter 1", theme_id: "dev" });
    expect(html).toContain("dk-hero__eyebrow");
    expect(html).toContain("Chapter 1");
  });

  it("eyebrow prop absent → NO element with class dk-hero__eyebrow", async () => {
    const html = await renderHero({ headline: "H", theme_id: "dev" });
    expect(html).not.toContain("dk-hero__eyebrow");
  });

  it("subheadline present → rendered in the output", async () => {
    const html = await renderHero({ headline: "H", subheadline: "Sub text", theme_id: "dev" });
    expect(html).toContain("dk-hero__subheadline");
    expect(html).toContain("Sub text");
  });

  it("subheadline absent → NO dk-hero__subheadline element", async () => {
    const html = await renderHero({ headline: "H", theme_id: "dev" });
    expect(html).not.toContain("dk-hero__subheadline");
  });

  it("cta_label present → rendered in the output", async () => {
    const html = await renderHero({ headline: "H", cta_label: "Get Started", theme_id: "dev" });
    expect(html).toContain("dk-hero__cta");
    expect(html).toContain("Get Started");
  });

  it("cta_label absent → NO dk-hero__cta element", async () => {
    const html = await renderHero({ headline: "H", theme_id: "dev" });
    expect(html).not.toContain("dk-hero__cta");
  });
});

// ---------------------------------------------------------------------------
// Background image
// ---------------------------------------------------------------------------

describe("Hero — background image", () => {
  it("background_treatment='image' + image_src → <img> is rendered", async () => {
    const html = await renderHero({
      headline: "H",
      background_treatment: "image",
      image_src: "/img/bg.jpg",
      theme_id: "dev",
    });
    expect(html).toContain("<img");
    expect(html).toContain("/img/bg.jpg");
  });

  it("background_treatment='image' + image_alt → <img> carries the alt text", async () => {
    const html = await renderHero({
      headline: "H",
      background_treatment: "image",
      image_src: "/img/bg.jpg",
      image_alt: "Dark cosmic background",
      theme_id: "dev",
    });
    expect(html).toContain('alt="Dark cosmic background"');
  });

  it("background_treatment='image' + no image_alt → <img> alt is empty string or bare attribute", async () => {
    const html = await renderHero({
      headline: "H",
      background_treatment: "image",
      image_src: "/img/bg.jpg",
      theme_id: "dev",
    });
    // Astro may serialize alt="" as the bare `alt` attribute (HTML5 boolean minimization)
    // or as alt="". Both are semantically equivalent empty-string alt values.
    expect(html).toMatch(/alt(="")?\s/);
  });

  it("background_treatment='color' (default) → NO <img> rendered", async () => {
    const html = await renderHero({ headline: "H", theme_id: "dev" });
    expect(html).not.toContain("<img");
  });

  it("background_treatment='image' with NO image_src → NO <img> rendered", async () => {
    const html = await renderHero({
      headline: "H",
      background_treatment: "image",
      theme_id: "dev",
    });
    expect(html).not.toContain("<img");
  });
});

// ---------------------------------------------------------------------------
// A11y / no inline styles / no raw colors (AC-02)
// ---------------------------------------------------------------------------

describe("Hero — AC-02 constraints", () => {
  it("rendered HTML contains NO style= attribute", async () => {
    const html = await renderHero({
      headline: "H",
      eyebrow: "E",
      subheadline: "S",
      cta_label: "C",
      background_treatment: "image",
      image_src: "/img/bg.jpg",
      theme_id: "dev",
    });
    // Astro scopes styles to a <style> block — the HTML output should have no
    // inline style= attributes on any element
    const bodyHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
    expect(bodyHtml).not.toMatch(NO_STYLE_ATTR);
  });

  it("rendered HTML contains NO literal color values (oklch/rgb/hex)", async () => {
    const html = await renderHero({
      headline: "H",
      eyebrow: "E",
      background_treatment: "image",
      image_src: "/img/bg.jpg",
      theme_id: "dev",
    });
    // Strip <style> blocks (CSS variables are fine there); check only HTML
    const bodyHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
    expect(bodyHtml).not.toMatch(NO_RAW_COLOR);
  });
});

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

describe("Hero — snapshot", () => {
  it("canonical render matches snapshot", async () => {
    const html = await renderHero({
      headline: "Design Systems at Scale",
      eyebrow: "Chapter 1",
      subheadline: "Building the primitives right.",
      cta_label: "Let's go",
      theme_id: "dev",
    });
    expect(html).toMatchSnapshot();
  });

  it("image background variant matches snapshot", async () => {
    const html = await renderHero({
      headline: "With Background",
      background_treatment: "image",
      image_src: "/img/hero.jpg",
      image_alt: "Hero image",
      theme_id: "dev",
    });
    expect(html).toMatchSnapshot();
  });
});
