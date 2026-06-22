/**
 * Tests for theme-resolver.ts — resolveTheme(), getRegisteredThemes().
 *
 * Covers: happy path resolution, throwing on unknown theme_id with the correct
 * message shape, and the registry contents.
 */
import { describe, it, expect } from "vitest";
import { resolveTheme, getRegisteredThemes } from "./theme-resolver.js";

// ---------------------------------------------------------------------------
// resolveTheme()
// ---------------------------------------------------------------------------

describe("resolveTheme()", () => {
  it("resolves 'dev' to a non-empty string", () => {
    const result = resolveTheme("dev");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("resolves 'dev' to a path containing 'dev.css'", () => {
    const result = resolveTheme("dev");
    expect(result).toContain("dev.css");
  });

  it("throws for an unknown theme_id", () => {
    expect(() => resolveTheme("nope")).toThrow();
  });

  it("thrown error message contains 'Unknown theme_id'", () => {
    expect(() => resolveTheme("nope")).toThrowError(/Unknown theme_id/);
  });

  it("thrown error message names the requested theme_id", () => {
    expect(() => resolveTheme("nope")).toThrowError(/nope/);
  });

  it("thrown error message lists the valid theme 'dev'", () => {
    expect(() => resolveTheme("nope")).toThrowError(/dev/);
  });

  it("thrown error is an instance of Error", () => {
    let caught: unknown;
    try {
      resolveTheme("unknown-theme");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// getRegisteredThemes()
// ---------------------------------------------------------------------------

describe("getRegisteredThemes()", () => {
  it("returns an array", () => {
    const result = getRegisteredThemes();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns exactly ['dev']", () => {
    expect(getRegisteredThemes()).toEqual(["dev"]);
  });

  it("each entry from getRegisteredThemes() resolves without throwing", () => {
    const themes = getRegisteredThemes();
    for (const theme of themes) {
      expect(() => resolveTheme(theme)).not.toThrow();
    }
  });
});
