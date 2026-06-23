/**
 * Container API tests for TwoUp.astro.
 *
 * Asserts: semantic root, two panes, aria-label on heading-less panes, divider
 * behavior, image rendering, zero inline styles, no literal colors, snapshot.
 */
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import TwoUp from "./TwoUp.astro";

const NO_STYLE_ATTR = /style\s*=/i;
const NO_RAW_COLOR = /oklch\(|rgb\(|#[0-9a-f]{3,8}/i;

async function renderTwoUp(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(TwoUp, { props });
}

const BASE_PROPS = {
  left_body: "Left content",
  right_body: "Right content",
  theme_id: "dev",
};

// ---------------------------------------------------------------------------
// Structural
// ---------------------------------------------------------------------------

describe("TwoUp — structure", () => {
  it("renders a <div> with data-layout='two-up'", async () => {
    const html = await renderTwoUp(BASE_PROPS);
    expect(html).toContain('data-layout="two-up"');
    expect(html).toContain("<div");
  });

  it("renders two pane divs", async () => {
    const html = await renderTwoUp(BASE_PROPS);
    const leftPane = html.includes("dk-twoup__pane--left");
    const rightPane = html.includes("dk-twoup__pane--right");
    expect(leftPane).toBe(true);
    expect(rightPane).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// A11y: aria-label on heading-less panes (NFR-06)
// ---------------------------------------------------------------------------

describe("TwoUp — a11y / aria-label", () => {
  it("left pane WITHOUT heading carries aria-label='left panel'", async () => {
    const html = await renderTwoUp(BASE_PROPS);
    expect(html).toContain('aria-label="left panel"');
  });

  it("right pane WITHOUT heading carries aria-label='right panel'", async () => {
    const html = await renderTwoUp(BASE_PROPS);
    expect(html).toContain('aria-label="right panel"');
  });

  it("left pane WITH heading does NOT carry aria-label", async () => {
    const html = await renderTwoUp({
      ...BASE_PROPS,
      left_heading: "Left Title",
    });
    // The pane with a heading should not have aria-label
    // We check that the left pane element doesn't carry it
    // (right pane still does, so we look at the left pane region)
    const leftPaneStart = html.indexOf("dk-twoup__pane--left");
    const leftPaneFragment = html.slice(leftPaneStart, leftPaneStart + 200);
    expect(leftPaneFragment).not.toContain('aria-label="left panel"');
  });

  it("right pane WITH heading does NOT carry aria-label", async () => {
    const html = await renderTwoUp({
      ...BASE_PROPS,
      right_heading: "Right Title",
    });
    const rightPaneStart = html.indexOf("dk-twoup__pane--right");
    const rightPaneFragment = html.slice(rightPaneStart, rightPaneStart + 200);
    expect(rightPaneFragment).not.toContain('aria-label="right panel"');
  });

  it("left heading present → <h2> rendered with heading text", async () => {
    const html = await renderTwoUp({ ...BASE_PROPS, left_heading: "My Left Heading" });
    expect(html).toContain("My Left Heading");
    expect(html).toContain("<h2");
  });
});

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

describe("TwoUp — divider", () => {
  it("divider default (true) → <div aria-hidden='true'> rendered", async () => {
    const html = await renderTwoUp(BASE_PROPS);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("dk-twoup__divider");
  });

  it("divider=true explicitly → divider rendered", async () => {
    const html = await renderTwoUp({ ...BASE_PROPS, divider: true });
    expect(html).toContain("dk-twoup__divider");
  });

  it("divider=false → divider NOT rendered", async () => {
    const html = await renderTwoUp({ ...BASE_PROPS, divider: false });
    expect(html).not.toContain("dk-twoup__divider");
    expect(html).not.toContain('aria-hidden="true"');
  });
});

// ---------------------------------------------------------------------------
// Image pane type
// ---------------------------------------------------------------------------

describe("TwoUp — image pane", () => {
  it("left_type='image' + left_image_src → <img> rendered in left pane", async () => {
    const html = await renderTwoUp({
      ...BASE_PROPS,
      left_type: "image",
      left_image_src: "/img/left.jpg",
      left_image_alt: "Left image",
    });
    expect(html).toContain("<img");
    expect(html).toContain("/img/left.jpg");
    expect(html).toContain('alt="Left image"');
  });

  it("left_type='image' + no image_alt → alt is empty string or bare attribute", async () => {
    const html = await renderTwoUp({
      ...BASE_PROPS,
      left_type: "image",
      left_image_src: "/img/left.jpg",
    });
    // Astro may serialize alt="" as the bare `alt` attribute (HTML5 boolean minimization)
    // or as alt="". Both are semantically equivalent empty-string alt values.
    expect(html).toMatch(/alt(="")?\s/);
  });

  it("right_type='image' + right_image_src → <img> rendered in right pane", async () => {
    const html = await renderTwoUp({
      ...BASE_PROPS,
      right_type: "image",
      right_image_src: "/img/right.jpg",
    });
    expect(html).toContain("/img/right.jpg");
  });
});

// ---------------------------------------------------------------------------
// AC-02 constraints
// ---------------------------------------------------------------------------

describe("TwoUp — AC-02 constraints", () => {
  it("rendered HTML contains NO style= attribute", async () => {
    const html = await renderTwoUp(BASE_PROPS);
    const bodyHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
    expect(bodyHtml).not.toMatch(NO_STYLE_ATTR);
  });

  it("rendered HTML contains NO literal color values", async () => {
    const html = await renderTwoUp(BASE_PROPS);
    const bodyHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
    expect(bodyHtml).not.toMatch(NO_RAW_COLOR);
  });
});

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

describe("TwoUp — snapshot", () => {
  it("canonical text-only render matches snapshot", async () => {
    const html = await renderTwoUp({
      left_body: "The left side story.",
      right_body: "The right side story.",
      theme_id: "dev",
    });
    expect(html).toMatchSnapshot();
  });

  it("with headings and divider=false matches snapshot", async () => {
    const html = await renderTwoUp({
      left_body: "Left body",
      right_body: "Right body",
      left_heading: "Left Title",
      right_heading: "Right Title",
      divider: false,
      theme_id: "dev",
    });
    expect(html).toMatchSnapshot();
  });
});
