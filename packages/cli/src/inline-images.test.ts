/**
 * inline-images.test.ts — authoring-flow v1 inliner test suite.
 *
 * Unit tests (U-01..U-15) call inlineImages() directly. Integration tests
 * (I-01..I-11) drive the full pipeline via runBuild() with the bundled template
 * passed explicitly (vitest runs source in-place, so resolveBundledTemplate()'s
 * dist-relative math does not apply — see build.test.ts). CI markers (C-01..C-02)
 * assert COMPOSE.md stays out of the codegen/drift path.
 *
 * Fixture rule (R-5): every hero fixture with image_src MUST also carry image_alt,
 * and every two-up *_image_src MUST carry its matching *_image_alt — otherwise
 * safeValidateDeck rejects the deck and masks the test intent.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import {
  inlineImages,
  InlinerError,
  MIME_BY_EXT,
  PER_IMAGE_WARN_BYTES,
  PER_IMAGE_ESCALATED_BYTES,
  TOTAL_HTML_ADVISORY_BYTES,
  FIELD_SPECS,
} from "./inline-images.js";
import { runBuild } from "./commands/build.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

const bundledTemplate = fileURLToPath(
  new URL("../templates/decklee-template.html", import.meta.url),
);

/** Minimal valid PNG-ish bytes (content is irrelevant to the inliner). */
const SAMPLE_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function sha(obj: unknown): string {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

/** Build a deck object with a single hero slide carrying the given content_props. */
function heroDeck(props: Record<string, unknown>): unknown {
  return {
    schema_version: "1",
    kind: "deck",
    id: "deck-test",
    meta: { title: "T", theme_id: "dev", source_outline_id: null },
    slides: [{ id: "s1", layout: "hero", content_props: props, speaker_notes: null }],
  };
}

/** Build a deck object with a single two-up slide. */
function twoUpDeck(props: Record<string, unknown>): unknown {
  return {
    schema_version: "1",
    kind: "deck",
    id: "deck-test",
    meta: { title: "T", theme_id: "dev", source_outline_id: null },
    slides: [{ id: "s2", layout: "two-up", content_props: props, speaker_notes: null }],
  };
}

// ─── shared I/O capture ──────────────────────────────────────────────────────

let stdoutOutput: string[];
let stderrOutput: string[];

beforeEach(() => {
  stdoutOutput = [];
  stderrOutput = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdoutOutput.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderrOutput.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT TESTS — inlineImages() direct
// ═══════════════════════════════════════════════════════════════════════════

describe("inlineImages — external URL hard reject (U-01..U-03)", () => {
  it("U-01 external http:// → VALIDATION_ERROR naming URL+field+slide", () => {
    const deck = heroDeck({ headline: "H", image_src: "http://example.com/image.png", image_alt: "a" });
    try {
      inlineImages(deck, "/tmp/deck.json");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(InlinerError);
      const err = e as InlinerError;
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.message).toContain("http://example.com/image.png");
      expect(err.message).toContain("image_src");
      expect(err.message).toContain("s1");
    }
  });

  it("U-02 external https:// → VALIDATION_ERROR", () => {
    const deck = heroDeck({ headline: "H", image_src: "https://cdn.example.com/photo.jpg", image_alt: "a" });
    expect(() => inlineImages(deck, "/tmp/deck.json")).toThrow(InlinerError);
    try {
      inlineImages(deck, "/tmp/deck.json");
    } catch (e) {
      expect((e as InlinerError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("U-03 protocol-relative // → VALIDATION_ERROR naming //", () => {
    const deck = heroDeck({ headline: "H", image_src: "//cdn.example.com/image.png", image_alt: "a" });
    try {
      inlineImages(deck, "/tmp/deck.json");
      expect.unreachable("should have thrown");
    } catch (e) {
      const err = e as InlinerError;
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.message).toContain("//cdn.example.com/image.png");
    }
  });
});

describe("inlineImages — MIME mapping (U-04)", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "decklee-inline-mime-"));
  });
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const cases: Array<[string, string]> = [
    [".png", "data:image/png;base64,"],
    [".jpg", "data:image/jpeg;base64,"],
    [".jpeg", "data:image/jpeg;base64,"],
    [".webp", "data:image/webp;base64,"],
    [".gif", "data:image/gif;base64,"],
    [".svg", "data:image/svg+xml;base64,"],
  ];

  for (const [ext, prefix] of cases) {
    it(`U-04 ${ext} → ${prefix}`, () => {
      const imgPath = join(tmpDir, `img${ext}`);
      writeFileSync(imgPath, SAMPLE_BYTES);
      const deckPath = join(tmpDir, "deck.json");
      const deck = heroDeck({ headline: "H", image_src: `./img${ext}`, image_alt: "a" });
      const result = inlineImages(deck, deckPath);
      type D = { slides: Array<{ content_props: Record<string, string> }> };
      expect((result.data as D).slides[0].content_props.image_src).toMatch(
        new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      );
    });
  }
});

describe("inlineImages — data: passthrough + idempotency (U-05, U-06, U-15)", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "decklee-inline-data-"));
  });
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("U-05 data: URI passthrough — unchanged, no warnings, no FS access", () => {
    const deck = heroDeck({ headline: "H", image_src: "data:image/png;base64,abc123", image_alt: "a" });
    const result = inlineImages(deck, "/tmp/deck.json");
    type D = { slides: Array<{ content_props: Record<string, string> }> };
    expect((result.data as D).slides[0].content_props.image_src).toBe(
      "data:image/png;base64,abc123",
    );
    expect(result.warnings).toHaveLength(0);
  });

  it("U-06 double-run on local image is bit-for-bit no-op (SHA equal)", () => {
    const imgPath = join(tmpDir, "img.png");
    writeFileSync(imgPath, SAMPLE_BYTES);
    const deckPath = join(tmpDir, "deck.json");
    const r1 = inlineImages(heroDeck({ headline: "H", image_src: "./img.png", image_alt: "a" }), deckPath);
    const r2 = inlineImages(r1.data, deckPath);
    expect(sha(r1.data)).toBe(sha(r2.data));
    expect(r2.warnings).toHaveLength(0);
  });

  it("U-15 idempotent re-run on already-inlined deck (data: branch skips)", () => {
    const imgPath = join(tmpDir, "img.png");
    writeFileSync(imgPath, SAMPLE_BYTES);
    const deckPath = join(tmpDir, "deck.json");
    const first = inlineImages(heroDeck({ headline: "H", image_src: "./img.png", image_alt: "a" }), deckPath);
    const second = inlineImages(first.data, deckPath);
    expect(second.warnings).toHaveLength(0);
    expect(sha(first.data)).toBe(sha(second.data));
  });
});

describe("inlineImages — determinism + key order (U-07, U-08)", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "decklee-inline-det-"));
  });
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("U-07 same input → identical output (SHA equal, two-up left+right)", () => {
    writeFileSync(join(tmpDir, "l.png"), SAMPLE_BYTES);
    writeFileSync(join(tmpDir, "r.jpg"), SAMPLE_BYTES);
    const deckPath = join(tmpDir, "deck.json");
    const make = () =>
      twoUpDeck({
        left_body: "L",
        right_body: "R",
        left_image_src: "./l.png",
        left_image_alt: "la",
        right_image_src: "./r.jpg",
        right_image_alt: "ra",
      });
    const a = inlineImages(make(), deckPath);
    const b = inlineImages(make(), deckPath);
    expect(sha(a.data)).toBe(sha(b.data));
  });

  it("U-08 JSON key order preserved; only image_src value changes", () => {
    writeFileSync(join(tmpDir, "img.png"), SAMPLE_BYTES);
    const deckPath = join(tmpDir, "deck.json");
    const deck = {
      schema_version: "1",
      kind: "deck",
      id: "deck-test",
      meta: { title: "T", theme_id: "dev", source_outline_id: null },
      slides: [
        {
          id: "s1",
          layout: "hero",
          content_props: { image_alt: "x", image_src: "./img.png", headline: "T", subheadline: "B" },
          speaker_notes: null,
        },
      ],
    };
    const result = inlineImages(deck, deckPath);
    expect(Object.keys((result.data as typeof deck).slides[0].content_props)).toEqual([
      "image_alt",
      "image_src",
      "headline",
      "subheadline",
    ]);
    expect((result.data as typeof deck).slides[0].content_props.image_src).toMatch(/^data:image\/png/);
  });
});

describe("inlineImages — IO errors (U-09, U-10)", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "decklee-inline-io-"));
  });
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("U-09 missing local file → IO_ERROR naming resolved path+field+slide", () => {
    const deckPath = join(tmpDir, "deck.json");
    try {
      inlineImages(heroDeck({ headline: "H", image_src: "./missing.png", image_alt: "a" }), deckPath);
      expect.unreachable("should have thrown");
    } catch (e) {
      const err = e as InlinerError;
      expect(err.code).toBe("IO_ERROR");
      expect(err.message).toContain(join(tmpDir, "missing.png"));
      expect(err.message).toContain("image_src");
      expect(err.message).toContain("s1");
    }
  });

  for (const ext of [".bmp", ".tiff", ".ico", ""]) {
    it(`U-10 unknown extension "${ext || "(none)"}" → IO_ERROR naming extension`, () => {
      const name = ext === "" ? "img" : `img${ext}`;
      writeFileSync(join(tmpDir, name), SAMPLE_BYTES);
      const deckPath = join(tmpDir, "deck.json");
      try {
        inlineImages(heroDeck({ headline: "H", image_src: `./${name}`, image_alt: "a" }), deckPath);
        expect.unreachable("should have thrown");
      } catch (e) {
        const err = e as InlinerError;
        expect(err.code).toBe("IO_ERROR");
        expect(err.message).toContain("Supported:");
      }
    });
  }
});

describe("inlineImages — no-op shapes (U-11, U-14)", () => {
  it("U-11a hero with no image_src key → no-op", () => {
    const deck = heroDeck({ headline: "H" });
    const before = sha(deck);
    const result = inlineImages(deck, "/tmp/deck.json");
    expect(sha(result.data)).toBe(before);
    expect(result.warnings).toHaveLength(0);
  });

  it("U-11b hero with empty-string image_src → no-op", () => {
    const deck = heroDeck({ headline: "H", image_src: "" });
    const before = sha(deck);
    const result = inlineImages(deck, "/tmp/deck.json");
    expect(sha(result.data)).toBe(before);
  });

  it("U-11c code slide with stray image_src → no-op (layout not in FIELD_SPECS)", () => {
    const deck = {
      schema_version: "1",
      kind: "deck",
      id: "d",
      meta: { title: "T", theme_id: "dev", source_outline_id: null },
      slides: [
        { id: "c1", layout: "code", content_props: { code: "x", language: "ts", image_src: "./x.png" }, speaker_notes: null },
      ],
    };
    const before = sha(deck);
    expect(sha(inlineImages(deck, "/tmp/deck.json").data)).toBe(before);
  });

  it("U-11d quote slide → no-op", () => {
    const deck = {
      schema_version: "1",
      kind: "deck",
      id: "d",
      meta: { title: "T", theme_id: "dev", source_outline_id: null },
      slides: [{ id: "q1", layout: "quote", content_props: { quote: "Q", image_src: "./x.png" }, speaker_notes: null }],
    };
    const before = sha(deck);
    expect(sha(inlineImages(deck, "/tmp/deck.json").data)).toBe(before);
  });

  it("U-11e hero content_props null → no-op", () => {
    const deck = {
      schema_version: "1",
      kind: "deck",
      id: "d",
      meta: { title: "T", theme_id: "dev", source_outline_id: null },
      slides: [{ id: "s1", layout: "hero", content_props: null, speaker_notes: null }],
    };
    expect(() => inlineImages(deck, "/tmp/deck.json")).not.toThrow();
    expect(inlineImages(deck, "/tmp/deck.json").warnings).toHaveLength(0);
  });

  it("U-14 malformed deck shapes → no-op {data, warnings:[]}", () => {
    expect(inlineImages(null, "/tmp/deck.json")).toEqual({ data: null, warnings: [] });
    expect(inlineImages(42, "/tmp/deck.json")).toEqual({ data: 42, warnings: [] });
    expect(inlineImages({}, "/tmp/deck.json")).toEqual({ data: {}, warnings: [] });
    expect(inlineImages({ slides: "nope" }, "/tmp/deck.json")).toEqual({
      data: { slides: "nope" },
      warnings: [],
    });
    expect(inlineImages({ slides: [] }, "/tmp/deck.json")).toEqual({ data: { slides: [] }, warnings: [] });
  });
});

describe("inlineImages — oversize warnings (U-12, U-13)", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "decklee-inline-size-"));
  });
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("U-12 ≥1.5MB <2.25MB → warning kind 'oversize', not thrown, still encoded", () => {
    writeFileSync(join(tmpDir, "big.png"), Buffer.alloc(1_600_000, 1));
    const deckPath = join(tmpDir, "deck.json");
    const r = inlineImages(heroDeck({ headline: "H", image_src: "./big.png", image_alt: "a" }), deckPath);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].kind).toBe("oversize");
    expect(r.warnings[0].bytes).toBe(1_600_000);
    expect(r.warnings[0].field).toBe("image_src");
    expect(
      (r.data as { slides: Array<{ content_props: Record<string, string> }> }).slides[0].content_props.image_src,
    ).toMatch(/^data:image\/png;base64,/);
  });

  it("U-13 ≥2.25MB → warning kind 'oversize-escalated', not thrown", () => {
    writeFileSync(join(tmpDir, "huge.png"), Buffer.alloc(2_400_000, 1));
    const deckPath = join(tmpDir, "deck.json");
    const r = inlineImages(heroDeck({ headline: "H", image_src: "./huge.png", image_alt: "a" }), deckPath);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].kind).toBe("oversize-escalated");
    expect((r.data as { slides: Array<{ content_props: Record<string, string> }> }).slides[0].content_props.image_src).toMatch(
      /^data:image\/png;base64,/,
    );
  });
});

describe("inlineImages — exported contract surface (AC-1)", () => {
  it("MIME_BY_EXT has exactly the 6 locked entries", () => {
    expect(Object.keys(MIME_BY_EXT).sort()).toEqual([".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
    expect(MIME_BY_EXT[".svg"]).toBe("image/svg+xml");
  });
  it("thresholds are the locked byte values", () => {
    expect(PER_IMAGE_WARN_BYTES).toBe(1_572_864);
    expect(PER_IMAGE_ESCALATED_BYTES).toBe(2_359_296);
    expect(TOTAL_HTML_ADVISORY_BYTES).toBe(15_728_640);
  });
  it("FIELD_SPECS has exactly the 3 walked fields", () => {
    expect(FIELD_SPECS).toEqual([
      { layout: "hero", prop: "image_src" },
      { layout: "two-up", prop: "left_image_src" },
      { layout: "two-up", prop: "right_image_src" },
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS — runBuild() pipeline
// ═══════════════════════════════════════════════════════════════════════════

describe("runBuild — image inliner integration (I-01..I-10)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "decklee-inline-build-"));
  });
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeDeck(deck: unknown): string {
    const p = join(tmpDir, "deck.json");
    writeFileSync(p, JSON.stringify(deck));
    return p;
  }

  it("I-01 external URL deck → exit 1 + VALIDATION_ERROR envelope on stderr", async () => {
    const deckPath = writeDeck(
      heroDeck({ headline: "H", image_src: "https://cdn.example.com/img.png", image_alt: "alt" }),
    );
    const code = await runBuild(deckPath, { template: bundledTemplate, out: join(tmpDir, "out.html") });
    expect(code).toBe(1);
    expect(stderrOutput.join("")).toContain('"code":"VALIDATION_ERROR"');
    expect(stdoutOutput.join("")).not.toContain("Built:");
  });

  it("I-02 missing local image → exit 2 + IO_ERROR envelope", async () => {
    const deckPath = writeDeck(heroDeck({ headline: "H", image_src: "./ghost.png", image_alt: "alt" }));
    const code = await runBuild(deckPath, { template: bundledTemplate, out: join(tmpDir, "out.html") });
    expect(code).toBe(2);
    expect(stderrOutput.join("")).toContain('"code":"IO_ERROR"');
    expect(stdoutOutput.join("")).not.toContain("Built:");
  });

  it("I-03 unknown extension → exit 2 + IO_ERROR naming .bmp", async () => {
    writeFileSync(join(tmpDir, "photo.bmp"), SAMPLE_BYTES);
    const deckPath = writeDeck(heroDeck({ headline: "H", image_src: "./photo.bmp", image_alt: "alt" }));
    const code = await runBuild(deckPath, { template: bundledTemplate, out: join(tmpDir, "out.html") });
    expect(code).toBe(2);
    const err = stderrOutput.join("");
    expect(err).toContain('"code":"IO_ERROR"');
    expect(err).toContain(".bmp");
  });

  it("I-04 happy path hero + two-up → exit 0, HTML has data: URIs", async () => {
    writeFileSync(join(tmpDir, "hero.png"), SAMPLE_BYTES);
    writeFileSync(join(tmpDir, "left.jpg"), SAMPLE_BYTES);
    writeFileSync(join(tmpDir, "right.jpg"), SAMPLE_BYTES);
    const deck = {
      schema_version: "1",
      kind: "deck",
      id: "deck-test",
      meta: { title: "T", theme_id: "dev", source_outline_id: null },
      slides: [
        { id: "s1", layout: "hero", content_props: { headline: "H", image_src: "./hero.png", image_alt: "Test alt" }, speaker_notes: null },
        {
          id: "s2",
          layout: "two-up",
          content_props: {
            left_body: "L",
            right_body: "R",
            left_image_src: "./left.jpg",
            left_image_alt: "la",
            right_image_src: "./right.jpg",
            right_image_alt: "ra",
          },
          speaker_notes: null,
        },
      ],
    };
    const outPath = join(tmpDir, "out.html");
    const code = await runBuild(writeDeck(deck), { template: bundledTemplate, out: outPath });
    expect(code).toBe(0);
    expect(stdoutOutput.join("")).toContain("Built:");
    expect(existsSync(outPath)).toBe(true);
    const html = readFileSync(outPath, "utf-8");
    expect(html).toContain("data:image/png;base64,");
    expect(html).toContain("data:image/jpeg;base64,");
  });

  it("I-05 oversize warning → exit 0, plain-text 'warning:' to stderr (NOT envelope)", async () => {
    writeFileSync(join(tmpDir, "big.png"), Buffer.alloc(1_600_000, 1));
    const deckPath = writeDeck(heroDeck({ headline: "H", image_src: "./big.png", image_alt: "alt" }));
    const code = await runBuild(deckPath, { template: bundledTemplate, out: join(tmpDir, "out.html") });
    expect(code).toBe(0);
    const err = stderrOutput.join("");
    expect(err).toContain("warning:");
    expect(err).not.toContain('{"error"');
    expect(stdoutOutput.join("")).toContain("Built:");
  });

  it("I-06 self-containment scan — no local src refs in emitted HTML (NFR-5)", async () => {
    writeFileSync(join(tmpDir, "hero.png"), SAMPLE_BYTES);
    const deckPath = writeDeck(heroDeck({ headline: "H", image_src: "./hero.png", image_alt: "alt" }));
    const outPath = join(tmpDir, "out.html");
    await runBuild(deckPath, { template: bundledTemplate, out: outPath });
    const html = readFileSync(outPath, "utf-8");
    // The island JSON must not carry the local path; image_src is now a data: URI.
    const match = html.match(/<script[^>]+id="decklee-deck"[^>]*>([\s\S]*?)<\/script>/);
    expect(match).toBeTruthy();
    const island = match![1];
    expect(island).not.toContain("./hero.png");
    expect(island).toContain("data:image/png;base64,");
  });

  it("I-07 HC-03 — data: URIs pass safeValidateDeck (build did not exit early)", async () => {
    writeFileSync(join(tmpDir, "hero.png"), SAMPLE_BYTES);
    const deckPath = writeDeck(heroDeck({ headline: "H", image_src: "./hero.png", image_alt: "alt" }));
    const code = await runBuild(deckPath, { template: bundledTemplate, out: join(tmpDir, "out.html") });
    expect(code).toBe(0);
    expect(stdoutOutput.join("")).toContain("Built:");
    expect(stderrOutput.join("")).not.toContain("VALIDATION_ERROR");
  });

  it("I-08 total-HTML ≥15MB → exit 0 + advisory warning referencing size", async () => {
    // One ~12MB raw image → ~16MB base64 in the HTML, crossing the 15MB advisory.
    writeFileSync(join(tmpDir, "huge.png"), Buffer.alloc(12_000_000, 1));
    const deckPath = writeDeck(heroDeck({ headline: "H", image_src: "./huge.png", image_alt: "alt" }));
    const outPath = join(tmpDir, "out.html");
    const code = await runBuild(deckPath, { template: bundledTemplate, out: outPath });
    expect(code).toBe(0);
    const err = stderrOutput.join("");
    expect(err).toContain("warning:");
    expect(err).toContain(outPath);
    expect(stdoutOutput.join("")).toContain("Built:");
  });

  it("I-09 total-HTML ≥20MB → exit 0 + escalated '> 20MB' warning", async () => {
    // One ~16MB raw image → ~21MB base64 in the HTML, crossing the 20MB escalation.
    writeFileSync(join(tmpDir, "massive.png"), Buffer.alloc(16_000_000, 1));
    const deckPath = writeDeck(heroDeck({ headline: "H", image_src: "./massive.png", image_alt: "alt" }));
    const outPath = join(tmpDir, "out.html");
    const code = await runBuild(deckPath, { template: bundledTemplate, out: outPath });
    expect(code).toBe(0);
    expect(stderrOutput.join("")).toContain("> 20MB");
    expect(stdoutOutput.join("")).toContain("Built:");
  });

  it("I-10 idempotent full-build re-run → byte-identical HTML", async () => {
    writeFileSync(join(tmpDir, "hero.png"), SAMPLE_BYTES);
    const deckPath = writeDeck(heroDeck({ headline: "H", image_src: "./hero.png", image_alt: "alt" }));
    const out1 = join(tmpDir, "out1.html");
    const out2 = join(tmpDir, "out2.html");
    await runBuild(deckPath, { template: bundledTemplate, out: out1 });
    await runBuild(deckPath, { template: bundledTemplate, out: out2 });
    expect(sha(readFileSync(out1, "utf-8"))).toBe(sha(readFileSync(out2, "utf-8")));
  });

  it("I-11 perf (non-gating) — 20-slide/10-image deck builds in ≤5s", async () => {
    for (let i = 0; i < 10; i++) {
      writeFileSync(join(tmpDir, `img${i}.png`), Buffer.alloc(500_000, 1)); // 5MB raw total
    }
    const slides: unknown[] = [];
    for (let i = 0; i < 20; i++) {
      if (i < 10) {
        slides.push({
          id: `s${i}`,
          layout: "hero",
          content_props: { headline: `H${i}`, image_src: `./img${i}.png`, image_alt: `a${i}` },
          speaker_notes: null,
        });
      } else {
        slides.push({ id: `s${i}`, layout: "quote", content_props: { quote: `Q${i}` }, speaker_notes: null });
      }
    }
    const deck = {
      schema_version: "1",
      kind: "deck",
      id: "deck-perf",
      meta: { title: "Perf", theme_id: "dev", source_outline_id: null },
      slides,
    };
    const t0 = Date.now();
    const code = await runBuild(writeDeck(deck), { template: bundledTemplate, out: join(tmpDir, "out.html") });
    const elapsed = Date.now() - t0;
    expect(code).toBe(0);
    expect(elapsed).toBeLessThanOrEqual(5000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CI / DRIFT INTEGRITY MARKERS (C-01, C-02)
// ═══════════════════════════════════════════════════════════════════════════

describe("CI drift integrity (C-01, C-02)", () => {
  const skillDir = fileURLToPath(new URL("../templates/init-scaffold/skill", import.meta.url));

  it("C-01 COMPOSE.md exists and is NOT referenced by the generator write list", () => {
    expect(existsSync(join(skillDir, "COMPOSE.md"))).toBe(true);
    const gen = readFileSync(
      fileURLToPath(new URL("../scripts/generate-contract.ts", import.meta.url)),
      "utf-8",
    );
    expect(gen).not.toContain("COMPOSE.md");
  });

  it("C-02 generated skill files (AGENTS/README/SKILL) still present and untouched by this feature", () => {
    expect(existsSync(join(skillDir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(skillDir, "README.md"))).toBe(true);
    expect(existsSync(join(skillDir, "SKILL.md"))).toBe(true);
  });
});
