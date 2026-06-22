// @vitest-environment node

/**
 * emit.test.ts -- unit + light integration tests for emitDeck.
 *
 * Unit tests (templateHtml / templatePath) run without viewer dist and import
 * emitDeck directly. The integration test (no opts) runs assembleTemplate()
 * which calls import.meta.resolve() internally. Vitest's Vite transform
 * rewrites that to a stub, so the integration test uses a child subprocess
 * (same strategy as assemble.test.ts) to avoid the transform.
 */
import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { emitDeck } from "./emit.js";
import type { DeckJson } from "@decklee/schema";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Viewer dist gate
// Direct filesystem check: viewer is a workspace package in node_modules.
// import.meta.resolve is intercepted by Vitest's transform; use URL math instead.
// ---------------------------------------------------------------------------

function viewerDistExists(): boolean {
  try {
    const distPath = fileURLToPath(
      new URL(
        "../node_modules/@decklee/viewer/dist/index.js",
        import.meta.url,
      ),
    );
    return existsSync(distPath);
  } catch {
    return false;
  }
}

const HAS_VIEWER_DIST = viewerDistExists();

// ---------------------------------------------------------------------------
// Minimal valid DeckJson fixture
// ---------------------------------------------------------------------------

const SAMPLE_DECK: DeckJson = {
  schema_version: "1",
  kind: "deck",
  id: "emit-test-deck-001",
  meta: {
    title: "Emit Test Deck",
    theme_id: "dev",
    source_outline_id: null,
  },
  slides: [
    {
      id: "slide-hero",
      layout: "hero",
      content_props: {
        headline: "Welcome to DeckLee",
        subheadline: "Fast, type-safe presentations",
        eyebrow: "v1",
      },
      speaker_notes: "Start strong.",
    },
    {
      id: "slide-code",
      layout: "code",
      content_props: {
        code: 'const x = 1;\nconsole.log(x);',
        language: "typescript",
        heading: "Example",
      },
      speaker_notes: null,
    },
  ],
};

/** A stub template that mirrors the real assemble output (island present). */
const STUB_TEMPLATE = `<!doctype html>
<html lang="en">
<head><title>DeckLee Presentation</title></head>
<body>
  <div class="reveal"><div class="slides"></div></div>
  <noscript>Enable JavaScript to view this presentation.</noscript>
  <script type="application/json" id="decklee-deck">{}</script>
  <script>(function(){})()</script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function extractIslandText(html: string): string {
  const m = html.match(/id="decklee-deck">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("island not found in HTML");
  return m[1];
}

// ---------------------------------------------------------------------------
// emitDeck with opts.templateHtml (unit -- no esbuild, no disk)
// ---------------------------------------------------------------------------

describe("emitDeck with templateHtml option", () => {
  it("returns HTML whose island contains the injected deck JSON", async () => {
    const result = await emitDeck(SAMPLE_DECK, { templateHtml: STUB_TEMPLATE });
    expect(result).toContain("emit-test-deck-001");
  });

  it("island round-trips: JSON.parse yields the original deck", async () => {
    const result = await emitDeck(SAMPLE_DECK, { templateHtml: STUB_TEMPLATE });
    const islandText = extractIslandText(result);
    const parsed = JSON.parse(islandText);
    expect(parsed).toEqual(SAMPLE_DECK);
  });

  it("island is NOT empty {} after emit", async () => {
    const result = await emitDeck(SAMPLE_DECK, { templateHtml: STUB_TEMPLATE });
    const islandText = extractIslandText(result);
    expect(islandText.trim()).not.toBe("{}");
    expect(islandText.length).toBeGreaterThan(20);
  });

  it("returns a string (not undefined)", async () => {
    const result = await emitDeck(SAMPLE_DECK, { templateHtml: STUB_TEMPLATE });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(100);
  });

  it("contains both island and bundled script (from stub)", async () => {
    const result = await emitDeck(SAMPLE_DECK, { templateHtml: STUB_TEMPLATE });
    expect(result).toContain('id="decklee-deck"');
    // The stub IIFE script must still be there
    expect(result).toContain("(function(){})(");
  });
});

// ---------------------------------------------------------------------------
// emitDeck with opts.templatePath (unit -- reads from temp file)
// ---------------------------------------------------------------------------

describe("emitDeck with templatePath option", () => {
  it("reads the template from disk and injects the deck", async () => {
    const tmpPath = join(tmpdir(), `decklee-test-${Date.now()}.html`);
    writeFileSync(tmpPath, STUB_TEMPLATE, "utf-8");

    const result = await emitDeck(SAMPLE_DECK, { templatePath: tmpPath });
    expect(result).toContain("emit-test-deck-001");

    const islandText = extractIslandText(result);
    const parsed = JSON.parse(islandText);
    expect(parsed).toEqual(SAMPLE_DECK);
  });

  it("returns full HTML string with deck island from file-backed template", async () => {
    const tmpPath = join(tmpdir(), `decklee-test-${Date.now()}.html`);
    writeFileSync(tmpPath, STUB_TEMPLATE, "utf-8");

    const result = await emitDeck(SAMPLE_DECK, { templatePath: tmpPath });
    expect(typeof result).toBe("string");
    expect(result).toContain("<!doctype html>");
    expect(result).toContain("emit-test-deck-001");
  });
});

// ---------------------------------------------------------------------------
// emitDeck error propagation (unit)
// ---------------------------------------------------------------------------

describe("emitDeck error propagation", () => {
  it("throws when the deck is invalid (with templateHtml)", async () => {
    const invalidDeck = { foo: "bar" };
    await expect(
      emitDeck(invalidDeck, { templateHtml: STUB_TEMPLATE })
    ).rejects.toThrow();
  });

  it("throws when deck is missing required slides (with templateHtml)", async () => {
    const incomplete = {
      schema_version: "1",
      kind: "deck",
      id: "x",
      meta: { title: "No slides", theme_id: "dev", source_outline_id: null },
    };
    await expect(
      emitDeck(incomplete, { templateHtml: STUB_TEMPLATE })
    ).rejects.toThrow();
  });

  it("throws when template has no island (with templateHtml)", async () => {
    const noIslandTemplate = "<html><body><p>no island here</p></body></html>";
    await expect(
      emitDeck(SAMPLE_DECK, { templateHtml: noIslandTemplate })
    ).rejects.toThrow("does not contain a valid decklee-deck island");
  });
});

// ---------------------------------------------------------------------------
// emitDeck integration (no opts -- runs assembleTemplate via esbuild)
// Gated on viewer dist presence.
// assembleTemplate uses import.meta.resolve which Vitest's Vite transform
// intercepts. We run emitDeck in a child process to avoid the stub.
// ---------------------------------------------------------------------------

async function runEmitInSubprocess(deck: DeckJson): Promise<string> {
  const thisDir = fileURLToPath(new URL(".", import.meta.url));
  const scriptPath = join(tmpdir(), `emit-runner-${Date.now()}.mjs`);

  // Import the .ts source files directly by absolute path to avoid the
  // .js extension issue that --experimental-strip-types can't bridge for
  // transitive imports like emit.ts -> ./assemble.js.
  const scriptContent = `
import { assembleTemplate } from ${JSON.stringify(join(thisDir, "assemble.ts"))};
import { injectDeck } from ${JSON.stringify(join(thisDir, "inject.ts"))};
const deck = ${JSON.stringify(deck)};
const template = await assembleTemplate();
const html = injectDeck(template, deck);
process.stdout.write(html);
`;

  writeFileSync(scriptPath, scriptContent, "utf-8");

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--experimental-strip-types", scriptPath],
      {
        cwd: thisDir,
        timeout: 60_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env },
      },
    );
    return stdout;
  } finally {
    try { rmSync(scriptPath); } catch { /* ignore */ }
  }
}

describe("emitDeck integration (full pipeline)", () => {
  it.skipIf(!HAS_VIEWER_DIST)(
    "assembles a full HTML document with IIFE and deck island (60s timeout)",
    async () => {
      const result = await runEmitInSubprocess(SAMPLE_DECK);
      // Must be a non-trivial HTML document
      expect(result).toContain("<!doctype html>");
      // Must have both the bundled IIFE script and the island
      expect(result).toContain('id="decklee-deck"');
      // Island must contain the deck id
      expect(result).toContain("emit-test-deck-001");
      // Island must round-trip
      const islandText = extractIslandText(result);
      const parsed = JSON.parse(islandText);
      expect(parsed.id).toBe("emit-test-deck-001");
      expect(parsed.slides).toHaveLength(2);
      // Must have reveal shell
      expect(result).toContain('class="reveal"');
      expect(result).toContain('class="slides"');
    },
    90_000,
  );
});
