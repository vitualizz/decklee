/**
 * Container API tests for Quote.astro.
 *
 * Asserts: semantic root (figure), blockquote, data-emphasis, conditional
 * figcaption (only when attribution or context present), no <hr> for "ruled",
 * zero inline styles, no literal colors, snapshot.
 */
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Quote from "./Quote.astro";

const NO_STYLE_ATTR = /style\s*=/i;
const NO_RAW_COLOR = /oklch\(|rgb\(|#[0-9a-f]{3,8}/i;

async function renderQuote(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Quote, { props });
}

// ---------------------------------------------------------------------------
// Structural
// ---------------------------------------------------------------------------

describe("Quote — structure", () => {
  it("renders a <figure> with data-layout='quote'", async () => {
    const html = await renderQuote({ quote: "Hello world", theme_id: "dev" });
    expect(html).toContain('data-layout="quote"');
    expect(html).toContain("<figure");
  });

  it("renders a <blockquote> with the quote text", async () => {
    const html = await renderQuote({ quote: "Be the change.", theme_id: "dev" });
    expect(html).toContain("<blockquote");
    expect(html).toContain("Be the change.");
  });
});

// ---------------------------------------------------------------------------
// data-emphasis
// ---------------------------------------------------------------------------

describe("Quote — data-emphasis", () => {
  it("default emphasis is 'centered' → data-emphasis='centered' on figure", async () => {
    const html = await renderQuote({ quote: "Q", theme_id: "dev" });
    expect(html).toContain('data-emphasis="centered"');
  });

  it("emphasis='ruled' → data-emphasis='ruled' on figure", async () => {
    const html = await renderQuote({ quote: "Q", emphasis: "ruled", theme_id: "dev" });
    expect(html).toContain('data-emphasis="ruled"');
  });

  it("emphasis='ruled' → NO <hr> element rendered", async () => {
    const html = await renderQuote({ quote: "Q", emphasis: "ruled", theme_id: "dev" });
    expect(html).not.toContain("<hr");
  });

  it("emphasis='full' → data-emphasis='full' on figure", async () => {
    const html = await renderQuote({ quote: "Q", emphasis: "full", theme_id: "dev" });
    expect(html).toContain('data-emphasis="full"');
  });
});

// ---------------------------------------------------------------------------
// figcaption — only when attribution or context present
// ---------------------------------------------------------------------------

describe("Quote — figcaption", () => {
  it("attribution + context both absent → NO <figcaption>", async () => {
    const html = await renderQuote({ quote: "No attribution", theme_id: "dev" });
    expect(html).not.toContain("<figcaption");
  });

  it("attribution present → <figcaption> rendered with attribution text", async () => {
    const html = await renderQuote({
      quote: "Q",
      attribution: "Albert Einstein",
      theme_id: "dev",
    });
    expect(html).toContain("<figcaption");
    expect(html).toContain("Albert Einstein");
    expect(html).toContain("dk-quote__attr");
  });

  it("context present (no attribution) → <figcaption> rendered with context text", async () => {
    const html = await renderQuote({
      quote: "Q",
      context: "Said at a conference",
      theme_id: "dev",
    });
    expect(html).toContain("<figcaption");
    expect(html).toContain("Said at a conference");
    expect(html).toContain("dk-quote__context");
  });

  it("both attribution and context present → both spans inside figcaption", async () => {
    const html = await renderQuote({
      quote: "Q",
      attribution: "Some Person",
      context: "2024 Keynote",
      theme_id: "dev",
    });
    expect(html).toContain("<figcaption");
    expect(html).toContain("Some Person");
    expect(html).toContain("2024 Keynote");
    expect(html).toContain("dk-quote__attr");
    expect(html).toContain("dk-quote__context");
  });

  it("attribution present but context absent → NO dk-quote__context span", async () => {
    const html = await renderQuote({
      quote: "Q",
      attribution: "Someone",
      theme_id: "dev",
    });
    expect(html).not.toContain("dk-quote__context");
  });

  it("context present but attribution absent → NO dk-quote__attr span", async () => {
    const html = await renderQuote({
      quote: "Q",
      context: "Some context",
      theme_id: "dev",
    });
    expect(html).not.toContain("dk-quote__attr");
  });
});

// ---------------------------------------------------------------------------
// AC-02 constraints
// ---------------------------------------------------------------------------

describe("Quote — AC-02 constraints", () => {
  it("rendered HTML contains NO style= attribute", async () => {
    const html = await renderQuote({
      quote: "Innovation is the engine of progress.",
      attribution: "A. Einstein",
      context: "1905",
      emphasis: "ruled",
      theme_id: "dev",
    });
    const bodyHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
    expect(bodyHtml).not.toMatch(NO_STYLE_ATTR);
  });

  it("rendered HTML contains NO literal color values", async () => {
    const html = await renderQuote({
      quote: "Innovation is the engine of progress.",
      attribution: "A. Einstein",
      theme_id: "dev",
    });
    const bodyHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
    expect(bodyHtml).not.toMatch(NO_RAW_COLOR);
  });
});

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

describe("Quote — snapshot", () => {
  it("canonical render with attribution + context matches snapshot", async () => {
    const html = await renderQuote({
      quote: "Simplicity is the ultimate sophistication.",
      attribution: "Leonardo da Vinci",
      context: "15th century",
      emphasis: "centered",
      theme_id: "dev",
    });
    expect(html).toMatchSnapshot();
  });

  it("ruled emphasis no figcaption matches snapshot", async () => {
    const html = await renderQuote({
      quote: "Less is more.",
      emphasis: "ruled",
      theme_id: "dev",
    });
    expect(html).toMatchSnapshot();
  });
});
