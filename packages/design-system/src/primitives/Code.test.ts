/**
 * Container API tests for Code.astro.
 *
 * Asserts: semantic root, pre/code structure, data-lang, set:html content,
 * heading conditional, caption with aria-describedby, highlight_lines
 * producing data-highlighted, zero inline styles, no literal colors, snapshot.
 */
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Code from "./Code.astro";

const NO_STYLE_ATTR = /style\s*=/i;
const NO_RAW_COLOR = /oklch\(|rgb\(|#[0-9a-f]{3,8}/i;

async function renderCode(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Code, { props });
}

// ---------------------------------------------------------------------------
// Structural
// ---------------------------------------------------------------------------

describe("Code — structure", () => {
  it("renders a <section> with data-layout='code'", async () => {
    const html = await renderCode({
      code: "const x = 1;",
      language: "typescript",
      theme_id: "dev",
    });
    expect(html).toContain('data-layout="code"');
    expect(html).toContain("<section");
  });

  it("renders a <pre> containing a <code> element", async () => {
    const html = await renderCode({
      code: "const x = 1;",
      language: "typescript",
      theme_id: "dev",
    });
    expect(html).toContain("<pre");
    expect(html).toContain("<code");
  });

  it("code element has class 'hljs'", async () => {
    const html = await renderCode({
      code: "const x = 1;",
      language: "typescript",
      theme_id: "dev",
    });
    expect(html).toMatch(/class="[^"]*hljs[^"]*"/);
  });

  it("code element carries data-lang attribute with the language", async () => {
    const html = await renderCode({
      code: "const x = 1;",
      language: "typescript",
      theme_id: "dev",
    });
    expect(html).toContain('data-lang="typescript"');
  });

  it("the code's tokenized content is rendered as HTML (not escaped)", async () => {
    const html = await renderCode({
      code: "const x = 1;",
      language: "typescript",
      theme_id: "dev",
    });
    // hljs wraps tokens in <span> elements; they must appear in the output
    expect(html).toContain("<span");
    // dk-code-line wrappers must be present
    expect(html).toContain("dk-code-line");
  });
});

// ---------------------------------------------------------------------------
// Heading (optional)
// ---------------------------------------------------------------------------

describe("Code — heading", () => {
  it("heading prop present → <h2> rendered", async () => {
    const html = await renderCode({
      code: "x = 1",
      language: "python",
      heading: "Example snippet",
      theme_id: "dev",
    });
    expect(html).toContain("<h2");
    expect(html).toContain("Example snippet");
  });

  it("heading prop absent → NO <h2> rendered", async () => {
    const html = await renderCode({
      code: "x = 1",
      language: "python",
      theme_id: "dev",
    });
    expect(html).not.toContain("<h2");
  });
});

// ---------------------------------------------------------------------------
// Caption + aria-describedby
// ---------------------------------------------------------------------------

describe("Code — caption", () => {
  it("caption present → <p id='dk-code-cap'> rendered", async () => {
    const html = await renderCode({
      code: "select 1",
      language: "sql",
      caption: "Listing 1",
      theme_id: "dev",
    });
    expect(html).toContain('id="dk-code-cap"');
    expect(html).toContain("Listing 1");
  });

  it("caption present → <pre> carries aria-describedby='dk-code-cap'", async () => {
    const html = await renderCode({
      code: "select 1",
      language: "sql",
      caption: "Listing 1",
      theme_id: "dev",
    });
    expect(html).toContain('aria-describedby="dk-code-cap"');
  });

  it("caption absent → NO <p id='dk-code-cap'>", async () => {
    const html = await renderCode({
      code: "select 1",
      language: "sql",
      theme_id: "dev",
    });
    expect(html).not.toContain("dk-code-cap");
  });

  it("caption absent → pre does NOT carry aria-describedby", async () => {
    const html = await renderCode({
      code: "select 1",
      language: "sql",
      theme_id: "dev",
    });
    expect(html).not.toContain("aria-describedby");
  });
});

// ---------------------------------------------------------------------------
// highlight_lines (AC-03)
// ---------------------------------------------------------------------------

describe("Code — highlight_lines", () => {
  it("highlight_lines targeting line 1 → that line's span has data-highlighted", async () => {
    const html = await renderCode({
      code: "line one\nline two\nline three",
      language: "bash",
      highlight_lines: [1],
      theme_id: "dev",
    });
    expect(html).toContain('data-highlighted');
    expect(html).toContain('aria-label="highlighted"');
    // data-line="1" should be the highlighted one
    expect(html).toContain('data-line="1" data-highlighted');
  });

  it("highlight_lines targeting line 2 → line 2 has data-highlighted, others don't", async () => {
    const html = await renderCode({
      code: "alpha\nbeta\ngamma",
      language: "bash",
      highlight_lines: [2],
      theme_id: "dev",
    });
    expect(html).toContain('data-line="2" data-highlighted');
    // Line 1 and 3 should not be highlighted (check that data-line="1" doesn't carry data-highlighted immediately after)
    expect(html).not.toMatch(/data-line="1"[^>]*data-highlighted/);
    expect(html).not.toMatch(/data-line="3"[^>]*data-highlighted/);
  });

  it("no highlight_lines → no data-highlighted in output", async () => {
    const html = await renderCode({
      code: "just code",
      language: "bash",
      theme_id: "dev",
    });
    expect(html).not.toContain("data-highlighted");
  });
});

// ---------------------------------------------------------------------------
// AC-02 constraints
// ---------------------------------------------------------------------------

describe("Code — AC-02 constraints", () => {
  it("rendered HTML contains NO style= attribute", async () => {
    const html = await renderCode({
      code: "const x = 1;",
      language: "typescript",
      heading: "Test",
      caption: "Caption",
      theme_id: "dev",
    });
    const bodyHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
    expect(bodyHtml).not.toMatch(NO_STYLE_ATTR);
  });

  it("rendered HTML contains NO literal color values", async () => {
    const html = await renderCode({
      code: "const x = 1;",
      language: "typescript",
      theme_id: "dev",
    });
    const bodyHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
    expect(bodyHtml).not.toMatch(NO_RAW_COLOR);
  });
});

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

describe("Code — snapshot", () => {
  it("canonical render matches snapshot", async () => {
    const html = await renderCode({
      code: "const greeting = 'hello';\nconsole.log(greeting);",
      language: "typescript",
      heading: "A TypeScript Example",
      caption: "Listing 1 — greeting",
      highlight_lines: [1],
      theme_id: "dev",
    });
    expect(html).toMatchSnapshot();
  });

  it("minimal render (no heading, no caption, no highlight) matches snapshot", async () => {
    const html = await renderCode({
      code: "print('hello')",
      language: "python",
      theme_id: "dev",
    });
    expect(html).toMatchSnapshot();
  });
});
