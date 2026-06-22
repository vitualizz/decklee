/**
 * compute-contrast.test.ts — Unit tests for WCAG 2.1 contrast helpers.
 *
 * All assertions are against the pure exported functions only; importing this
 * module has zero side effects (no writes, no process.exit, no stderr noise
 * unless contrastRatio itself emits — it does not).
 */
import { describe, it, expect } from "vitest";
import {
  parseRgb,
  relativeLuminance,
  contrastRatio,
  label,
  BG_BASE,
  AA_NORMAL,
  AA_UI,
  AAA_NORMAL,
} from "./compute-contrast.js";
import type { Rgb } from "./compute-contrast.js";

// ── parseRgb ──────────────────────────────────────────────────────────────────

describe("parseRgb", () => {
  it("parses a compact rgb() string", () => {
    expect(parseRgb("rgb(11,12,17)")).toEqual([11, 12, 17]);
  });

  it("parses rgb() with spaces", () => {
    expect(parseRgb("rgb(11, 12, 17)")).toEqual([11, 12, 17]);
  });

  it("parses rgba() and discards alpha", () => {
    expect(parseRgb("rgba(79, 179, 255, 0.5)")).toEqual([79, 179, 255]);
  });

  it("throws on an unrecognised string", () => {
    expect(() => parseRgb("hsl(240 5% 6%)")).toThrow(/parseRgb/);
  });
});

// ── relativeLuminance ─────────────────────────────────────────────────────────

describe("relativeLuminance", () => {
  it("returns 0 for pure black", () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
  });

  it("returns 1 for pure white", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 4);
  });

  it("bg-base rgb(11,12,17) is a very dark near-black (L < 0.005)", () => {
    const L = relativeLuminance(BG_BASE);
    expect(L).toBeGreaterThan(0);
    expect(L).toBeLessThan(0.005);
  });

  it("accent-1 rgb(79,179,255) is noticeably bright (L > 0.4)", () => {
    const accent1: Rgb = [79, 179, 255];
    expect(relativeLuminance(accent1)).toBeGreaterThan(0.4);
  });
});

// ── contrastRatio ─────────────────────────────────────────────────────────────

describe("contrastRatio", () => {
  it("white vs black yields ratio 21:1", () => {
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 0);
  });

  it("black vs black yields ratio 1:1", () => {
    expect(contrastRatio([0, 0, 0], [0, 0, 0])).toBeCloseTo(1, 4);
  });

  it("defaults second argument to BG_BASE when omitted", () => {
    const accent1: Rgb = [79, 179, 255];
    expect(contrastRatio(accent1)).toBeCloseTo(contrastRatio(accent1, BG_BASE), 6);
  });

  it("is commutative — argument order does not affect ratio", () => {
    const fg: Rgb = [200, 210, 220];
    const bg: Rgb = [11, 12, 17];
    expect(contrastRatio(fg, bg)).toBeCloseTo(contrastRatio(bg, fg), 6);
  });

  it("accent-1 rgb(79,179,255) vs bg-base is above AA (>= 4.5) — bright blue on near-black", () => {
    const accent1: Rgb = [79, 179, 255];
    expect(contrastRatio(accent1, BG_BASE)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("fg-primary rgb(232,234,239) vs bg-base exceeds AAA threshold (>= 7)", () => {
    // Dev theme fg-primary: near-white on near-black — should be AAA.
    const fgPrimary: Rgb = [232, 234, 239];
    expect(contrastRatio(fgPrimary, BG_BASE)).toBeGreaterThanOrEqual(AAA_NORMAL);
  });

  it("bg-surface vs bg-base is near-1 (both dark backgrounds — low contrast, expected)", () => {
    // These are bg colors not expected to pass text contrast — ratio close to 1:1.
    const bgSurface: Rgb = [22, 24, 31]; // dev theme bg-surface approximation
    const ratio = contrastRatio(bgSurface, BG_BASE);
    expect(ratio).toBeLessThan(AA_UI); // below 3 — not suitable for text
  });

  it("ratio is always >= 1 regardless of input order", () => {
    const a: Rgb = [50, 50, 50];
    const b: Rgb = [200, 200, 200];
    expect(contrastRatio(a, b)).toBeGreaterThanOrEqual(1);
    expect(contrastRatio(b, a)).toBeGreaterThanOrEqual(1);
  });
});

// ── label (WCAG threshold classifier) ────────────────────────────────────────

describe("label", () => {
  const cases: { ratio: number; expected: string }[] = [
    { ratio: 21, expected: "AAA" },
    { ratio: 7, expected: "AAA" },      // exactly 7 → AAA
    { ratio: 6.99, expected: "AA" },
    { ratio: 4.5, expected: "AA" },     // exactly 4.5 → AA
    { ratio: 4.49, expected: "AA Large/UI" },
    { ratio: 3, expected: "AA Large/UI" }, // exactly 3 → AA Large/UI
    { ratio: 2.9, expected: "FAIL" },
    { ratio: 1, expected: "FAIL" },
  ];

  for (const { ratio, expected } of cases) {
    it(`ratio ${ratio} → '${expected}'`, () => {
      expect(label(ratio)).toBe(expected);
    });
  }

  it("accent-1 vs bg-base is labelled AAA (known high-contrast token)", () => {
    const accent1: Rgb = [79, 179, 255];
    const ratio = contrastRatio(accent1, BG_BASE);
    expect(label(ratio)).toBe("AAA");
  });

  it("fg-muted rgb(154,163,178) vs bg-base is labelled AA or higher (accessible body text)", () => {
    // Dev theme fg-muted: mid-grey on near-black — must pass AA for body text.
    const fgMuted: Rgb = [154, 163, 178];
    const ratio = contrastRatio(fgMuted, BG_BASE);
    const l = label(ratio);
    expect(["AA", "AAA"]).toContain(l);
  });

  it("bg-surface vs bg-base is labelled FAIL (backgrounds are exempt — low ratio expected)", () => {
    const bgSurface: Rgb = [22, 24, 31];
    const ratio = contrastRatio(bgSurface, BG_BASE);
    expect(label(ratio)).toBe("FAIL");
  });
});

// ── alpha-only token exemption (design-level check) ──────────────────────────

describe("alpha-only tokens (border / overlay-bg) are not tested by contrastRatio", () => {
  it("border token (rgba(255,255,255,0.08)) — parseRgb extracts opaque channels and notes it is near-black", () => {
    // Border uses rgba with near-zero effective luminance when composited.
    // The exemption is that generate-token-data skips these; here we just
    // confirm that parseRgb can handle an rgba() without crashing, and the
    // pure-opaque RGB would fail (ratio < 3) — matching the 'alpha-blended — N/A' label.
    const borderChannels = parseRgb("rgba(255, 255, 255, 0.08)");
    expect(borderChannels).toEqual([255, 255, 255]); // alpha discarded
    // If measured purely (ignoring alpha), opaque white would pass — but the alpha
    // exemption means the token is flagged differently by the generator.
    // We only assert parseRgb doesn't throw.
  });
});
