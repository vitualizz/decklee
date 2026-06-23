/**
 * T-013 — renderQuote unit tests (AC-01 DOM contract).
 *
 * Tests: root=figure, blockquote always, data-emphasis default/ruled, figcaption
 * conditional (attribution/context), no data-astro-*, no inline style=.
 *
 * Also tests renderSlide speaker-notes aside (AC-04) via render/index dispatch.
 */
import { describe, it, expect } from "vitest";
import type { DeckJson } from "@decklee/schema";
import { renderQuote } from "./quote.js";
import { renderDeck } from "./index.js";

describe("renderQuote — root element", () => {
  it("returns a <figure> (NOT a section)", () => {
    const el = renderQuote({ quote: "Hello world" });
    expect(el.tagName.toLowerCase()).toBe("figure");
  });

  it("root has class 'dk-quote'", () => {
    const el = renderQuote({ quote: "Q" });
    expect(el.classList.contains("dk-quote")).toBe(true);
  });

  it("root has data-layout='quote'", () => {
    const el = renderQuote({ quote: "Q" });
    expect(el.getAttribute("data-layout")).toBe("quote");
  });

  it("does NOT emit any data-astro-* attributes", () => {
    const el = renderQuote({ quote: "Q", attribution: "A", context: "C", emphasis: "ruled" });
    expect(el.outerHTML).not.toMatch(/data-astro-/);
  });

  it("does NOT emit any inline style= attributes", () => {
    const el = renderQuote({ quote: "Q", attribution: "A" });
    expect(el.outerHTML).not.toMatch(/\bstyle\s*=/i);
  });

  it("does NOT emit entrance animation classes", () => {
    const el = renderQuote({ quote: "Q" });
    expect(el.outerHTML).not.toMatch(/\b(rise|ar|al|af|as|ag)\b/);
  });
});

describe("renderQuote — blockquote (always present)", () => {
  it("always renders blockquote.dk-quote__text", () => {
    const el = renderQuote({ quote: "Simplicity is the ultimate sophistication." });
    const bq = el.querySelector("blockquote.dk-quote__text");
    expect(bq).not.toBeNull();
    expect(bq?.textContent).toBe("Simplicity is the ultimate sophistication.");
  });
});

describe("renderQuote — data-emphasis", () => {
  it("default emphasis is 'centered'", () => {
    const el = renderQuote({ quote: "Q" });
    expect(el.getAttribute("data-emphasis")).toBe("centered");
  });

  it("emphasis='ruled' → data-emphasis='ruled'", () => {
    const el = renderQuote({ quote: "Q", emphasis: "ruled" });
    expect(el.getAttribute("data-emphasis")).toBe("ruled");
  });

  it("emphasis='full' → data-emphasis='full'", () => {
    const el = renderQuote({ quote: "Q", emphasis: "full" });
    expect(el.getAttribute("data-emphasis")).toBe("full");
  });

  it("emphasis='centered' explicit → data-emphasis='centered'", () => {
    const el = renderQuote({ quote: "Q", emphasis: "centered" });
    expect(el.getAttribute("data-emphasis")).toBe("centered");
  });
});

describe("renderQuote — figcaption (conditional)", () => {
  it("attribution + context → figcaption.dk-quote__caption rendered", () => {
    const el = renderQuote({
      quote: "Q",
      attribution: "Leonardo da Vinci",
      context: "15th century",
    });
    const figcaption = el.querySelector("figcaption.dk-quote__caption");
    expect(figcaption).not.toBeNull();
  });

  it("attribution present → span.dk-quote__attr with text", () => {
    const el = renderQuote({ quote: "Q", attribution: "Leonardo da Vinci" });
    const span = el.querySelector("span.dk-quote__attr");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("Leonardo da Vinci");
  });

  it("context present → span.dk-quote__context with text", () => {
    const el = renderQuote({ quote: "Q", context: "15th century" });
    const span = el.querySelector("span.dk-quote__context");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("15th century");
  });

  it("only attribution → NO span.dk-quote__context", () => {
    const el = renderQuote({ quote: "Q", attribution: "Someone" });
    expect(el.querySelector(".dk-quote__context")).toBeNull();
  });

  it("only context → NO span.dk-quote__attr", () => {
    const el = renderQuote({ quote: "Q", context: "Some context" });
    expect(el.querySelector(".dk-quote__attr")).toBeNull();
  });

  it("neither attribution nor context → NO figcaption", () => {
    const el = renderQuote({ quote: "Less is more." });
    expect(el.querySelector("figcaption")).toBeNull();
  });

  it("ruled emphasis with no attribution/context → NO figcaption", () => {
    const el = renderQuote({ quote: "Less is more.", emphasis: "ruled" });
    expect(el.querySelector("figcaption")).toBeNull();
  });
});

describe("renderDeck — speaker notes aside (AC-04)", () => {
  // The notes <aside> now lives on the slide <section> wrapper that renderDeck
  // builds (not on the primitive root). reveal.js's notes plugin reads it there.
  function oneSlideDeck(slide: unknown): DeckJson {
    return { slides: [slide] } as unknown as DeckJson;
  }

  it("speaker_notes truthy → aside.notes inside the slide <section>", () => {
    const [section] = renderDeck(
      oneSlideDeck({
        id: "s1",
        layout: "quote",
        speaker_notes: "Remember to pause here.",
        content_props: { quote: "Q" },
      }),
    );
    const aside = section.querySelector("aside.notes");
    expect(aside).not.toBeNull();
    expect(aside?.textContent).toBe("Remember to pause here.");
  });

  it("speaker_notes null → NO aside.notes", () => {
    const [section] = renderDeck(
      oneSlideDeck({
        id: "s1",
        layout: "quote",
        speaker_notes: null,
        content_props: { quote: "Q" },
      }),
    );
    expect(section.querySelector("aside.notes")).toBeNull();
  });

  it("speaker_notes empty string → NO aside.notes", () => {
    const [section] = renderDeck(
      oneSlideDeck({
        id: "s1",
        layout: "hero",
        speaker_notes: "",
        content_props: { headline: "H" },
      }),
    );
    // Empty string is falsy — no aside should be rendered
    expect(section.querySelector("aside.notes")).toBeNull();
  });
});
