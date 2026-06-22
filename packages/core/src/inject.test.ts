/**
 * inject.test.ts -- unit tests for safeJsonForHtml + injectDeck.
 *
 * No viewer dist required. Uses a minimal stub template string with the
 * decklee-deck island marker. All assertions are on string content.
 */
import { describe, it, expect } from "vitest";
import { injectDeck, safeJsonForHtml } from "./inject.js";
import type { DeckJson } from "@decklee/schema";

// ---------------------------------------------------------------------------
// Constants: U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR)
// These are valid JS line terminators; using \u escapes so the source file
// itself does not contain raw chars that break TS parsers.
// ---------------------------------------------------------------------------
const LINE_SEP = " ";
const PARA_SEP = " ";

// ---------------------------------------------------------------------------
// Minimal valid DeckJson fixture
// ---------------------------------------------------------------------------

/** A minimal valid deck that passes validateDeck(). */
function makeValidDeck(overrides?: Partial<DeckJson>): DeckJson {
  const base: DeckJson = {
    schema_version: "1",
    kind: "deck",
    id: "test-deck-001",
    meta: {
      title: "Test Deck",
      theme_id: "dev",
      source_outline_id: null,
    },
    slides: [
      {
        id: "slide-001",
        layout: "hero",
        content_props: {
          headline: "Hello World",
          subheadline: "A test slide",
        },
        speaker_notes: null,
      },
    ],
  };
  return { ...base, ...overrides };
}

/** A stub template with the island marker (matches the assemble output pattern). */
const STUB_TEMPLATE = `<!doctype html>
<html lang="en">
<head><title>Test</title></head>
<body>
  <script type="application/json" id="decklee-deck">{}</script>
  <script>window.__app__ = true;</script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Helper: extract island text content from HTML string
// ---------------------------------------------------------------------------

function extractIslandText(html: string): string {
  // Match the text node between the island open tag and the closing </script>
  const m = html.match(/id="decklee-deck">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("island not found in HTML");
  return m[1];
}

// ---------------------------------------------------------------------------
// safeJsonForHtml -- unit tests
// ---------------------------------------------------------------------------

describe("safeJsonForHtml", () => {
  it("returns valid JSON that round-trips through JSON.parse", () => {
    const obj = { a: 1, b: "hello", c: null };
    const result = safeJsonForHtml(obj);
    expect(JSON.parse(result)).toEqual(obj);
  });

  it("escapes < to \\u003c so </script> cannot close the element", () => {
    const obj = { text: "</script>" };
    const result = safeJsonForHtml(obj);
    // Must NOT contain the literal sequence </script>
    expect(result.toLowerCase()).not.toContain("</script>");
    // Must contain the unicode escape of <
    expect(result).toContain("\\u003c");
    // Round-trips to original value
    expect(JSON.parse(result)).toEqual(obj);
  });

  it("escape form is \\u003c (GC-5 -- NOT \\/ or \\! which produce invalid JSON)", () => {
    const obj = { text: "</script>" };
    const result = safeJsonForHtml(obj);
    // Must be the unicode form
    expect(result).toContain("\\u003c");
    // Must NOT produce \! (broken form from original dev-spec)
    expect(result).not.toContain("\\!");
    // The result is parseable as JSON
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("neutralises <!-- via the < escape", () => {
    const obj = { text: "<!--" };
    const result = safeJsonForHtml(obj);
    expect(result).not.toContain("<!--");
    expect(result).toContain("\\u003c");
    expect(JSON.parse(result)).toEqual(obj);
  });

  it("neutralises <script> via the < escape", () => {
    const obj = { text: "<script>alert(1)</script>" };
    const result = safeJsonForHtml(obj);
    expect(result.toLowerCase()).not.toContain("<script>");
    expect(JSON.parse(result)).toEqual(obj);
  });

  it("escapes U+2028 (LINE SEPARATOR) to \\u2028", () => {
    const obj = { text: `line${LINE_SEP}sep` };
    const result = safeJsonForHtml(obj);
    // Raw U+2028 must not appear in the serialised output
    expect(result).not.toContain(LINE_SEP);
    // Must be escaped to the Unicode escape sequence
    expect(result).toContain("\\u2028");
    // Round-trips correctly
    expect(JSON.parse(result)).toEqual(obj);
  });

  it("escapes U+2029 (PARAGRAPH SEPARATOR) to \\u2029", () => {
    const obj = { text: `para${PARA_SEP}sep` };
    const result = safeJsonForHtml(obj);
    expect(result).not.toContain(PARA_SEP);
    expect(result).toContain("\\u2029");
    expect(JSON.parse(result)).toEqual(obj);
  });

  it("passes through ordinary strings unchanged (no over-escaping)", () => {
    const obj = { text: "hello world -- no special chars" };
    const result = safeJsonForHtml(obj);
    expect(result).toContain("hello world");
  });
});

// ---------------------------------------------------------------------------
// injectDeck -- unit tests
// ---------------------------------------------------------------------------

describe("injectDeck", () => {
  it("happy path: replaces the empty island with the deck JSON", () => {
    const deck = makeValidDeck();
    const result = injectDeck(STUB_TEMPLATE, deck);
    // Island must no longer be {}
    expect(result).not.toMatch(/id="decklee-deck">\s*\{\}\s*<\/script>/);
    // Must contain the deck id somewhere in the output
    expect(result).toContain("test-deck-001");
  });

  it("round-trips: parsing the island JSON gives back the original deck", () => {
    const deck = makeValidDeck();
    const result = injectDeck(STUB_TEMPLATE, deck);
    const islandText = extractIslandText(result);
    const parsed = JSON.parse(islandText);
    expect(parsed).toEqual(deck);
  });

  it("island is NOT empty {} after injection", () => {
    const deck = makeValidDeck();
    const result = injectDeck(STUB_TEMPLATE, deck);
    const islandText = extractIslandText(result);
    expect(islandText.trim()).not.toBe("{}");
    expect(islandText.length).toBeGreaterThan(10);
  });

  // --- escaping edge cases --------------------------------------------------

  it("</script> in deck meta.title: raw sequence absent inside island, round-trips", () => {
    // meta.title is safe for this -- it is a string field, not checked by HC-03 style scan.
    const deck = makeValidDeck({
      meta: {
        title: "Slides with </script> injection attempt",
        theme_id: "dev",
        source_outline_id: null,
      },
    });
    const result = injectDeck(STUB_TEMPLATE, deck);
    const islandText = extractIslandText(result);

    // Raw </script> must not appear inside the island text
    expect(islandText.toLowerCase()).not.toContain("</script>");
    // The unicode escape of < must appear
    expect(islandText).toContain("\\u003c");
    // JSON.parse round-trip restores the original string
    const parsed = JSON.parse(islandText);
    expect(parsed.meta.title).toBe("Slides with </script> injection attempt");
  });

  it("<!-- in deck text: raw sequence absent in island, round-trips", () => {
    const deck = makeValidDeck({
      meta: {
        title: "<!-- comment injection",
        theme_id: "dev",
        source_outline_id: null,
      },
    });
    const result = injectDeck(STUB_TEMPLATE, deck);
    const islandText = extractIslandText(result);

    expect(islandText).not.toContain("<!--");
    expect(JSON.parse(islandText).meta.title).toBe("<!-- comment injection");
  });

  it("<script> in deck text: raw sequence absent in island, round-trips", () => {
    const deck = makeValidDeck({
      meta: {
        title: "<script>xss</script>",
        theme_id: "dev",
        source_outline_id: null,
      },
    });
    const result = injectDeck(STUB_TEMPLATE, deck);
    const islandText = extractIslandText(result);

    expect(islandText.toLowerCase()).not.toContain("<script>");
    expect(JSON.parse(islandText).meta.title).toBe("<script>xss</script>");
  });

  it("$& in JSON value is not interpolated (function replacer guard)", () => {
    const deck = makeValidDeck({
      meta: {
        title: "Cost is $& and $1 check",
        theme_id: "dev",
        source_outline_id: null,
      },
    });
    const result = injectDeck(STUB_TEMPLATE, deck);
    const islandText = extractIslandText(result);
    const parsed = JSON.parse(islandText);
    // The $ patterns must survive verbatim
    expect(parsed.meta.title).toBe("Cost is $& and $1 check");
  });

  it("$1 in JSON value is not interpolated (function replacer guard)", () => {
    const deck = makeValidDeck({
      meta: {
        title: "Group reference $1 and $2 and $& test",
        theme_id: "dev",
        source_outline_id: null,
      },
    });
    const result = injectDeck(STUB_TEMPLATE, deck);
    const islandText = extractIslandText(result);
    const parsed = JSON.parse(islandText);
    expect(parsed.meta.title).toBe("Group reference $1 and $2 and $& test");
  });

  // --- error cases ----------------------------------------------------------

  it("throws on missing island (template without decklee-deck)", () => {
    const noIslandTemplate = "<html><body><p>no island here</p></body></html>";
    const deck = makeValidDeck();
    expect(() => injectDeck(noIslandTemplate, deck)).toThrow(
      "does not contain a valid decklee-deck island",
    );
  });

  it("throws ZodError on invalid deck (unrecognised shape)", () => {
    const invalidDeck = { foo: "bar" };
    expect(() => injectDeck(STUB_TEMPLATE, invalidDeck)).toThrow();
  });

  it("throws on deck missing slides array", () => {
    const incomplete = {
      schema_version: "1",
      kind: "deck",
      id: "x",
      meta: { title: "No slides", theme_id: "dev", source_outline_id: null },
      // slides intentionally missing
    };
    expect(() => injectDeck(STUB_TEMPLATE, incomplete)).toThrow();
  });

  it("throws on deck with banned layout value", () => {
    const badLayout = {
      schema_version: "1",
      kind: "deck",
      id: "x",
      meta: { title: "Bad", theme_id: "dev", source_outline_id: null },
      slides: [
        {
          id: "s1",
          layout: "not-a-real-layout",
          content_props: { headline: "Hi" },
          speaker_notes: null,
        },
      ],
    };
    expect(() => injectDeck(STUB_TEMPLATE, badLayout)).toThrow();
  });

  it("preserves the rest of the template HTML intact", () => {
    const deck = makeValidDeck();
    const result = injectDeck(STUB_TEMPLATE, deck);
    // The IIFE stub script after the island must still be present
    expect(result).toContain("window.__app__ = true;");
    expect(result).toContain("</html>");
  });

  it("U+2028 in deck text is escaped and round-trips", () => {
    const deck = makeValidDeck({
      meta: {
        title: `line${LINE_SEP}separator`,
        theme_id: "dev",
        source_outline_id: null,
      },
    });
    const result = injectDeck(STUB_TEMPLATE, deck);
    const islandText = extractIslandText(result);
    // Raw U+2028 must not appear in island
    expect(islandText).not.toContain(LINE_SEP);
    const parsed = JSON.parse(islandText);
    expect(parsed.meta.title).toBe(`line${LINE_SEP}separator`);
  });

  it("U+2029 in deck text is escaped and round-trips", () => {
    const deck = makeValidDeck({
      meta: {
        title: `para${PARA_SEP}separator`,
        theme_id: "dev",
        source_outline_id: null,
      },
    });
    const result = injectDeck(STUB_TEMPLATE, deck);
    const islandText = extractIslandText(result);
    expect(islandText).not.toContain(PARA_SEP);
    const parsed = JSON.parse(islandText);
    expect(parsed.meta.title).toBe(`para${PARA_SEP}separator`);
  });
});
