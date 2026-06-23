/**
 * T-013 — renderHero unit tests (AC-01 DOM contract).
 *
 * Tests every conditional branch: eyebrow, subheadline, cta, background image.
 * Asserts absence of data-astro-* attrs, inline style=, and entrance classes.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHero } from "./hero.js";

describe("renderHero — root element", () => {
  it("returns a <div> element", () => {
    const el = renderHero({ headline: "Test" });
    expect(el.tagName.toLowerCase()).toBe("div");
  });

  it("root has class 'dk-hero'", () => {
    const el = renderHero({ headline: "Test" });
    expect(el.classList.contains("dk-hero")).toBe(true);
  });

  it("root has data-layout='hero'", () => {
    const el = renderHero({ headline: "Test" });
    expect(el.getAttribute("data-layout")).toBe("hero");
  });

  it("does NOT emit any data-astro-* attributes", () => {
    const el = renderHero({ headline: "Test", eyebrow: "E", subheadline: "S", cta_label: "Go" });
    const html = el.outerHTML;
    expect(html).not.toMatch(/data-astro-/);
  });

  it("does NOT emit any inline style= attributes", () => {
    const el = renderHero({
      headline: "Test",
      background_treatment: "image",
      image_src: "/img/bg.jpg",
    });
    expect(el.outerHTML).not.toMatch(/\bstyle\s*=/i);
  });

  it("does NOT emit entrance animation classes", () => {
    const el = renderHero({ headline: "Test" });
    const html = el.outerHTML;
    expect(html).not.toMatch(/\b(rise|ar|al|af|as|ag)\b/);
  });
});

describe("renderHero — h1 headline (always present)", () => {
  it("always renders h1.dk-hero__headline", () => {
    const el = renderHero({ headline: "My Headline" });
    const h1 = el.querySelector("h1.dk-hero__headline");
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe("My Headline");
  });
});

describe("renderHero — eyebrow (conditional)", () => {
  it("eyebrow truthy → p.dk-hero__eyebrow rendered with text", () => {
    const el = renderHero({ headline: "H", eyebrow: "Chapter 1" });
    const p = el.querySelector("p.dk-hero__eyebrow");
    expect(p).not.toBeNull();
    expect(p?.textContent).toBe("Chapter 1");
  });

  it("eyebrow absent → NO p.dk-hero__eyebrow rendered", () => {
    const el = renderHero({ headline: "H" });
    expect(el.querySelector(".dk-hero__eyebrow")).toBeNull();
  });

  it("eyebrow appears BEFORE h1 in DOM order", () => {
    const el = renderHero({ headline: "H", eyebrow: "Eye" });
    const children = [...el.children];
    const eyebrowIdx = children.findIndex((c) => c.classList.contains("dk-hero__eyebrow"));
    const headlineIdx = children.findIndex((c) => c.classList.contains("dk-hero__headline"));
    expect(eyebrowIdx).toBeLessThan(headlineIdx);
  });
});

describe("renderHero — subheadline (conditional)", () => {
  it("subheadline truthy → p.dk-hero__subheadline rendered", () => {
    const el = renderHero({ headline: "H", subheadline: "Sub text" });
    const p = el.querySelector("p.dk-hero__subheadline");
    expect(p).not.toBeNull();
    expect(p?.textContent).toBe("Sub text");
  });

  it("subheadline absent → NO p.dk-hero__subheadline rendered", () => {
    const el = renderHero({ headline: "H" });
    expect(el.querySelector(".dk-hero__subheadline")).toBeNull();
  });

  it("subheadline appears AFTER h1 in DOM order", () => {
    const el = renderHero({ headline: "H", subheadline: "Sub" });
    const children = [...el.children];
    const headlineIdx = children.findIndex((c) => c.classList.contains("dk-hero__headline"));
    const subIdx = children.findIndex((c) => c.classList.contains("dk-hero__subheadline"));
    expect(subIdx).toBeGreaterThan(headlineIdx);
  });
});

describe("renderHero — cta_label (conditional)", () => {
  it("cta_label truthy → p.dk-hero__cta rendered", () => {
    const el = renderHero({ headline: "H", cta_label: "Let's go" });
    const p = el.querySelector("p.dk-hero__cta");
    expect(p).not.toBeNull();
    expect(p?.textContent).toBe("Let's go");
  });

  it("cta_label absent → NO p.dk-hero__cta rendered", () => {
    const el = renderHero({ headline: "H" });
    expect(el.querySelector(".dk-hero__cta")).toBeNull();
  });
});

describe("renderHero — background image (conditional)", () => {
  it("background_treatment='image' + image_src → img.dk-hero__bg rendered", () => {
    const el = renderHero({
      headline: "H",
      background_treatment: "image",
      image_src: "/img/hero.jpg",
    });
    const img = el.querySelector("img.dk-hero__bg");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/img/hero.jpg");
  });

  it("img carries image_alt when provided", () => {
    const el = renderHero({
      headline: "H",
      background_treatment: "image",
      image_src: "/img/hero.jpg",
      image_alt: "Hero image",
    });
    const img = el.querySelector("img.dk-hero__bg");
    expect(img?.getAttribute("alt")).toBe("Hero image");
  });

  it("img has empty alt when image_alt omitted", () => {
    const el = renderHero({
      headline: "H",
      background_treatment: "image",
      image_src: "/img/hero.jpg",
    });
    const img = el.querySelector("img.dk-hero__bg");
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("background_treatment='color' (default) → NO img rendered", () => {
    const el = renderHero({ headline: "H" });
    expect(el.querySelector("img")).toBeNull();
  });

  it("background_treatment='image' with NO image_src → NO img rendered", () => {
    const el = renderHero({ headline: "H", background_treatment: "image" });
    expect(el.querySelector("img")).toBeNull();
  });

  it("img appears AFTER cta in DOM order (last child)", () => {
    const el = renderHero({
      headline: "H",
      cta_label: "Go",
      background_treatment: "image",
      image_src: "/img/bg.jpg",
    });
    const children = [...el.children];
    const ctaIdx = children.findIndex((c) => c.classList.contains("dk-hero__cta"));
    const imgIdx = children.findIndex((c) => c.classList.contains("dk-hero__bg"));
    expect(imgIdx).toBeGreaterThan(ctaIdx);
  });
});

describe("renderHero — child order (eyebrow, h1, subheadline, cta, img)", () => {
  it("full props → correct order of 5 children", () => {
    const el = renderHero({
      headline: "H",
      eyebrow: "E",
      subheadline: "S",
      cta_label: "C",
      background_treatment: "image",
      image_src: "/img/bg.jpg",
    });
    const classes = [...el.children].map((c) =>
      c.classList.contains("dk-hero__eyebrow")
        ? "eyebrow"
        : c.classList.contains("dk-hero__headline")
          ? "headline"
          : c.classList.contains("dk-hero__subheadline")
            ? "subheadline"
            : c.classList.contains("dk-hero__cta")
              ? "cta"
              : "img"
    );
    expect(classes).toEqual(["eyebrow", "headline", "subheadline", "cta", "img"]);
  });
});
