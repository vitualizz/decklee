/**
 * T-017 — reveal-config unit tests (AC-01: 10 canonical config values).
 *
 * Only asserts the exported REVEAL_CONFIG const — never calls configureReveal()
 * so no Reveal constructor is invoked. Runs cleanly in jsdom (no layout APIs
 * needed for this test; the mock is supplied by vi.mock to keep reveal.js from
 * executing its module-level side-effects).
 */
import { describe, it, expect, vi, beforeAll } from "vitest";

// vi.mock must be before any imports that transitively reach reveal.js.
vi.mock("reveal.js", () => ({
  default: class MockReveal {
    constructor(_el: unknown, _cfg: unknown) {}
    initialize() {}
  },
}));
vi.mock("reveal.js/plugin/notes", () => ({ default: {} }));

describe("REVEAL_CONFIG — canonical values (AC-01)", () => {
  let REVEAL_CONFIG: Record<string, unknown>;

  beforeAll(async () => {
    const mod = await import("./reveal-config.js");
    REVEAL_CONFIG = mod.REVEAL_CONFIG as unknown as Record<string, unknown>;
  });

  it("width is 1920", () => {
    expect(REVEAL_CONFIG.width).toBe(1920);
  });

  it("height is 1080", () => {
    expect(REVEAL_CONFIG.height).toBe(1080);
  });

  it("margin is 0", () => {
    expect(REVEAL_CONFIG.margin).toBe(0);
  });

  it("minScale is 0.1", () => {
    expect(REVEAL_CONFIG.minScale).toBe(0.1);
  });

  it("maxScale is 2", () => {
    expect(REVEAL_CONFIG.maxScale).toBe(2);
  });

  it("center is false", () => {
    expect(REVEAL_CONFIG.center).toBe(false);
  });

  it("hash is true", () => {
    expect(REVEAL_CONFIG.hash).toBe(true);
  });

  it("controls is true", () => {
    expect(REVEAL_CONFIG.controls).toBe(true);
  });

  it("progress is true", () => {
    expect(REVEAL_CONFIG.progress).toBe(true);
  });

  it("slideNumber is 'c/t'", () => {
    expect(REVEAL_CONFIG.slideNumber).toBe("c/t");
  });

  it("transition is 'fade'", () => {
    expect(REVEAL_CONFIG.transition).toBe("fade");
  });

  it("plugins array has length 1 (RevealNotes)", () => {
    expect(Array.isArray(REVEAL_CONFIG.plugins)).toBe(true);
    expect((REVEAL_CONFIG.plugins as unknown[]).length).toBe(1);
  });
});
