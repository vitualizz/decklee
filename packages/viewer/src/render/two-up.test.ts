/**
 * T-013 — renderTwoUp unit tests (AC-01 DOM contract).
 *
 * Tests: text-only (aria-label on panes, divider present), headings (no aria-label),
 * divider=false, image pane, no data-astro-*, no inline style=.
 */
import { describe, it, expect } from "vitest";
import { renderTwoUp } from "./two-up.js";

const BASE_PROPS = {
  left_body: "Left content",
  right_body: "Right content",
};

describe("renderTwoUp — root element", () => {
  it("returns a <section> element", () => {
    const el = renderTwoUp(BASE_PROPS);
    expect(el.tagName.toLowerCase()).toBe("section");
  });

  it("root has class 'dk-twoup'", () => {
    const el = renderTwoUp(BASE_PROPS);
    expect(el.classList.contains("dk-twoup")).toBe(true);
  });

  it("root has data-layout='two-up'", () => {
    const el = renderTwoUp(BASE_PROPS);
    expect(el.getAttribute("data-layout")).toBe("two-up");
  });

  it("does NOT emit any data-astro-* attributes", () => {
    const el = renderTwoUp(BASE_PROPS);
    expect(el.outerHTML).not.toMatch(/data-astro-/);
  });

  it("does NOT emit any inline style= attributes", () => {
    const el = renderTwoUp(BASE_PROPS);
    expect(el.outerHTML).not.toMatch(/\bstyle\s*=/i);
  });

  it("does NOT emit entrance animation classes", () => {
    const el = renderTwoUp(BASE_PROPS);
    expect(el.outerHTML).not.toMatch(/\b(rise|ar|al|af|as|ag)\b/);
  });
});

describe("renderTwoUp — text-only panes (no headings)", () => {
  it("left pane has class 'dk-twoup__pane--left'", () => {
    const el = renderTwoUp(BASE_PROPS);
    expect(el.querySelector(".dk-twoup__pane--left")).not.toBeNull();
  });

  it("right pane has class 'dk-twoup__pane--right'", () => {
    const el = renderTwoUp(BASE_PROPS);
    expect(el.querySelector(".dk-twoup__pane--right")).not.toBeNull();
  });

  it("left pane carries aria-label='left panel' when no heading", () => {
    const el = renderTwoUp(BASE_PROPS);
    const pane = el.querySelector(".dk-twoup__pane--left");
    expect(pane?.getAttribute("aria-label")).toBe("left panel");
  });

  it("right pane carries aria-label='right panel' when no heading", () => {
    const el = renderTwoUp(BASE_PROPS);
    const pane = el.querySelector(".dk-twoup__pane--right");
    expect(pane?.getAttribute("aria-label")).toBe("right panel");
  });

  it("left pane has p.dk-twoup__body with left_body text", () => {
    const el = renderTwoUp({ left_body: "The left side story.", right_body: "Right" });
    const p = el.querySelector(".dk-twoup__pane--left .dk-twoup__body");
    expect(p).not.toBeNull();
    expect(p?.textContent).toBe("The left side story.");
  });

  it("right pane has p.dk-twoup__body with right_body text", () => {
    const el = renderTwoUp({ left_body: "Left", right_body: "The right side story." });
    const p = el.querySelector(".dk-twoup__pane--right .dk-twoup__body");
    expect(p?.textContent).toBe("The right side story.");
  });
});

describe("renderTwoUp — divider", () => {
  it("divider defaults to present (div.dk-twoup__divider + aria-hidden=true)", () => {
    const el = renderTwoUp(BASE_PROPS);
    const divider = el.querySelector(".dk-twoup__divider");
    expect(divider).not.toBeNull();
    expect(divider?.getAttribute("aria-hidden")).toBe("true");
  });

  it("divider=true explicitly → divider rendered", () => {
    const el = renderTwoUp({ ...BASE_PROPS, divider: true });
    expect(el.querySelector(".dk-twoup__divider")).not.toBeNull();
  });

  it("divider=false → NO divider div", () => {
    const el = renderTwoUp({ ...BASE_PROPS, divider: false });
    expect(el.querySelector(".dk-twoup__divider")).toBeNull();
    expect(el.outerHTML).not.toContain('aria-hidden="true"');
  });
});

describe("renderTwoUp — headings present", () => {
  it("left_heading present → h2.dk-twoup__heading rendered in left pane", () => {
    const el = renderTwoUp({ ...BASE_PROPS, left_heading: "Left Title" });
    const h2 = el.querySelector(".dk-twoup__pane--left h2.dk-twoup__heading");
    expect(h2).not.toBeNull();
    expect(h2?.textContent).toBe("Left Title");
  });

  it("right_heading present → h2.dk-twoup__heading rendered in right pane", () => {
    const el = renderTwoUp({ ...BASE_PROPS, right_heading: "Right Title" });
    const h2 = el.querySelector(".dk-twoup__pane--right h2.dk-twoup__heading");
    expect(h2).not.toBeNull();
    expect(h2?.textContent).toBe("Right Title");
  });

  it("left pane WITH heading does NOT carry aria-label", () => {
    const el = renderTwoUp({ ...BASE_PROPS, left_heading: "Left Title" });
    const pane = el.querySelector(".dk-twoup__pane--left");
    expect(pane?.hasAttribute("aria-label")).toBe(false);
  });

  it("right pane WITH heading does NOT carry aria-label", () => {
    const el = renderTwoUp({ ...BASE_PROPS, right_heading: "Right Title" });
    const pane = el.querySelector(".dk-twoup__pane--right");
    expect(pane?.hasAttribute("aria-label")).toBe(false);
  });

  it("both headings + divider=false: no divider, no aria-labels", () => {
    const el = renderTwoUp({
      left_body: "Left body",
      right_body: "Right body",
      left_heading: "Left Title",
      right_heading: "Right Title",
      divider: false,
    });
    expect(el.querySelector(".dk-twoup__divider")).toBeNull();
    expect(el.querySelector('[aria-label="left panel"]')).toBeNull();
    expect(el.querySelector('[aria-label="right panel"]')).toBeNull();
    expect(el.querySelector(".dk-twoup__pane--left h2")?.textContent).toBe("Left Title");
    expect(el.querySelector(".dk-twoup__pane--right h2")?.textContent).toBe("Right Title");
  });
});

describe("renderTwoUp — image pane type", () => {
  it("left_type='image' + left_image_src → img.dk-twoup__image in left pane", () => {
    const el = renderTwoUp({
      ...BASE_PROPS,
      left_type: "image",
      left_image_src: "/img/left.jpg",
    });
    const img = el.querySelector(".dk-twoup__pane--left img.dk-twoup__image");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/img/left.jpg");
  });

  it("img carries left_image_alt when provided", () => {
    const el = renderTwoUp({
      ...BASE_PROPS,
      left_type: "image",
      left_image_src: "/img/left.jpg",
      left_image_alt: "Left image",
    });
    const img = el.querySelector(".dk-twoup__pane--left img");
    expect(img?.getAttribute("alt")).toBe("Left image");
  });

  it("left_type='image' + NO left_image_src → p.dk-twoup__body rendered instead", () => {
    const el = renderTwoUp({ ...BASE_PROPS, left_type: "image" });
    expect(el.querySelector(".dk-twoup__pane--left img")).toBeNull();
    expect(el.querySelector(".dk-twoup__pane--left .dk-twoup__body")).not.toBeNull();
  });

  it("right_type='image' + right_image_src → img in right pane", () => {
    const el = renderTwoUp({
      ...BASE_PROPS,
      right_type: "image",
      right_image_src: "/img/right.jpg",
    });
    const img = el.querySelector(".dk-twoup__pane--right img.dk-twoup__image");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/img/right.jpg");
  });
});

describe("renderTwoUp — DOM order (left pane, divider, right pane)", () => {
  it("children order is left-pane, divider, right-pane", () => {
    const el = renderTwoUp(BASE_PROPS);
    const children = [...el.children];
    expect(children[0].classList.contains("dk-twoup__pane--left")).toBe(true);
    expect(children[1].classList.contains("dk-twoup__divider")).toBe(true);
    expect(children[2].classList.contains("dk-twoup__pane--right")).toBe(true);
  });
});
