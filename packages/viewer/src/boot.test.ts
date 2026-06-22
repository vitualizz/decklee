/**
 * T-016 — boot() unit tests (AC-01, AC-02, AC-04, AC-05).
 *
 * Stubs reveal.js (no layout APIs in jsdom). Sets up a DOM with the expected
 * structure (#decklee-deck island + .reveal > .slides) and asserts the full
 * boot sequence for valid, invalid-JSON, invalid-schema, and unknown-layout decks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks must be hoisted (vi.mock calls are hoisted to the top by vitest).
vi.mock("reveal.js", () => ({
  default: class MockReveal {
    static initializeCalls = 0;
    static lastConfig: unknown = null;
    static lastEl: unknown = null;

    constructor(el: unknown, cfg: unknown) {
      MockReveal.lastEl = el;
      MockReveal.lastConfig = cfg;
    }
    initialize() {
      MockReveal.initializeCalls += 1;
    }
  },
}));

vi.mock("reveal.js/plugin/notes", () => ({ default: {} }));

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function setupDOM(islandContent: string): void {
  document.body.innerHTML = `
    <div class="reveal">
      <div class="slides"></div>
    </div>
    <script id="decklee-deck" type="application/json">${islandContent}</script>
  `;
}

/** Build a minimal valid DeckJson with the given slides. */
function makeDeck(slides: unknown[] = []): unknown {
  return {
    schema_version: "1",
    kind: "deck",
    id: "test-deck-001",
    meta: { title: "Test Deck", theme_id: "dev", source_outline_id: null },
    slides,
  };
}

function makeHeroSlide(id = "s1", speaker_notes: string | null = null) {
  return {
    id,
    layout: "hero",
    speaker_notes,
    content_props: { headline: "Test Hero" },
  };
}

function makeQuoteSlide(id = "s2") {
  return {
    id,
    layout: "quote",
    speaker_notes: null,
    content_props: { quote: "Less is more." },
  };
}

function makeTwoUpSlide(id = "s3") {
  return {
    id,
    layout: "two-up",
    speaker_notes: null,
    content_props: { left_body: "Left", right_body: "Right" },
  };
}

function makeCodeSlide(id = "s4") {
  return {
    id,
    layout: "code",
    speaker_notes: null,
    content_props: { code: "const x = 1;", language: "typescript" },
  };
}

// ---------------------------------------------------------------------------
// Reset MockReveal state and DOM between tests
// ---------------------------------------------------------------------------

// We import the mock class after mocking so we can reset its static state.
// We do it lazily inside each test via a dynamic import or just reset the counter.

let MockReveal: { initializeCalls: number; lastConfig: unknown; lastEl: unknown };

beforeEach(async () => {
  // Dynamically get the mocked constructor to access static state
  const revealMod = await import("reveal.js");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MockReveal = revealMod.default as any;
  MockReveal.initializeCalls = 0;
  MockReveal.lastConfig = null;
  MockReveal.lastEl = null;

  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
  // Reset module state for boot (it uses { once: true } so reimport is needed)
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("boot() — does NOT auto-run on import", () => {
  it("importing boot does not append slides or call Reveal", async () => {
    setupDOM(JSON.stringify(makeDeck([makeHeroSlide()])));
    // Import ONLY — do not call boot()
    await import("./boot.js");
    // Reveal should NOT have been initialized
    expect(MockReveal.initializeCalls).toBe(0);
    // Slides container should be empty
    const slides = document.querySelector(".reveal .slides");
    expect(slides?.children.length).toBe(0);
  });
});

describe("boot() — valid deck", () => {
  it("appends one slide per layout to .reveal .slides", async () => {
    setupDOM(
      JSON.stringify(
        makeDeck([makeHeroSlide(), makeQuoteSlide(), makeTwoUpSlide(), makeCodeSlide()]),
      ),
    );
    const { boot } = await import("./boot.js");
    boot();

    const slides = document.querySelector(".reveal .slides");
    expect(slides?.children.length).toBe(4);
  });

  it("sets data-theme on .reveal element from meta.theme_id", async () => {
    setupDOM(JSON.stringify(makeDeck([makeHeroSlide()])));
    const { boot } = await import("./boot.js");
    boot();

    const reveal = document.querySelector(".reveal");
    expect(reveal?.getAttribute("data-theme")).toBe("dev");
  });

  it("calls Reveal.initialize() exactly once", async () => {
    setupDOM(JSON.stringify(makeDeck([makeHeroSlide()])));
    const { boot } = await import("./boot.js");
    boot();

    expect(MockReveal.initializeCalls).toBe(1);
  });

  it("does NOT render a .dk-error-panel when deck is valid", async () => {
    setupDOM(JSON.stringify(makeDeck([makeHeroSlide()])));
    const { boot } = await import("./boot.js");
    boot();

    expect(document.querySelector(".dk-error-panel")).toBeNull();
  });

  it("each slide has aria-label='Slide N of T' set", async () => {
    setupDOM(
      JSON.stringify(
        makeDeck([makeHeroSlide("s1"), makeQuoteSlide("s2")]),
      ),
    );
    const { boot } = await import("./boot.js");
    boot();

    const slides = document.querySelector(".reveal .slides");
    const slideEls = Array.from(slides?.children ?? []);
    expect(slideEls[0].getAttribute("aria-label")).toBe("Slide 1 of 2");
    expect(slideEls[1].getAttribute("aria-label")).toBe("Slide 2 of 2");
  });
});

describe("boot() — speaker notes (AC-04)", () => {
  it("slide.speaker_notes truthy → aside.notes inside rendered section", async () => {
    setupDOM(
      JSON.stringify(
        makeDeck([makeHeroSlide("s1", "Remember to pause here.")]),
      ),
    );
    const { boot } = await import("./boot.js");
    boot();

    const slides = document.querySelector(".reveal .slides");
    const aside = slides?.querySelector("aside.notes");
    expect(aside).not.toBeNull();
    expect(aside?.textContent).toBe("Remember to pause here.");
  });
});

describe("boot() — invalid JSON in island", () => {
  it("malformed JSON → .dk-error-panel rendered with role=alert", async () => {
    setupDOM("{this is not json}");
    const { boot } = await import("./boot.js");
    boot();

    const panel = document.querySelector(".dk-error-panel");
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute("role")).toBe("alert");
  });

  it("malformed JSON → error panel text contains 'Invalid JSON'", async () => {
    setupDOM("{this is not json}");
    const { boot } = await import("./boot.js");
    boot();

    const panel = document.querySelector(".dk-error-panel");
    expect(panel?.textContent).toContain("Invalid JSON");
  });

  it("malformed JSON → Reveal.initialize NOT called", async () => {
    setupDOM("{this is not json}");
    const { boot } = await import("./boot.js");
    boot();

    expect(MockReveal.initializeCalls).toBe(0);
  });
});

describe("boot() — schema validation failure (invalid deck)", () => {
  it("missing required fields → .dk-error-panel rendered", async () => {
    // Missing schema_version, kind, id, meta — Zod will reject this
    setupDOM(JSON.stringify({ slides: [] }));
    const { boot } = await import("./boot.js");
    boot();

    expect(document.querySelector(".dk-error-panel")).not.toBeNull();
  });

  it("schema failure → Reveal.initialize NOT called", async () => {
    setupDOM(JSON.stringify({ slides: [] }));
    const { boot } = await import("./boot.js");
    boot();

    expect(MockReveal.initializeCalls).toBe(0);
  });

  it("schema failure → error panel has role=alert", async () => {
    setupDOM(JSON.stringify({ slides: [] }));
    const { boot } = await import("./boot.js");
    boot();

    const panel = document.querySelector(".dk-error-panel");
    expect(panel?.getAttribute("role")).toBe("alert");
  });
});

describe("boot() — unknown layout (render error)", () => {
  it("deck with unknown layout 'banner' → .dk-error-panel rendered", async () => {
    const deck = {
      schema_version: "1",
      kind: "deck",
      id: "test-deck-001",
      meta: { title: "T", theme_id: "dev", source_outline_id: null },
      slides: [
        {
          id: "s1",
          layout: "banner", // not a valid layout
          speaker_notes: null,
          content_props: { headline: "H" },
        },
      ],
    };
    // Note: safeValidateDeck will reject this because "banner" is not a valid layout enum
    // The error panel will be rendered from the validation step, not the render step.
    setupDOM(JSON.stringify(deck));
    const { boot } = await import("./boot.js");
    boot();

    expect(document.querySelector(".dk-error-panel")).not.toBeNull();
  });

  it("unknown layout → Reveal.initialize NOT called", async () => {
    const deck = {
      schema_version: "1",
      kind: "deck",
      id: "test-deck-001",
      meta: { title: "T", theme_id: "dev", source_outline_id: null },
      slides: [
        {
          id: "s1",
          layout: "banner",
          speaker_notes: null,
          content_props: { headline: "H" },
        },
      ],
    };
    setupDOM(JSON.stringify(deck));
    const { boot } = await import("./boot.js");
    boot();

    expect(MockReveal.initializeCalls).toBe(0);
  });
});
