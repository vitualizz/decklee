/**
 * Tests for validate-theme.ts — validateTheme().
 *
 * Validates the cascade-form contract: every --dk-color-* property that has an
 * oklch() declaration MUST have a preceding rgb()/rgba() declaration for the
 * same property in the same block. Alpha-only (rgba, no oklch) and var()-alias
 * props are exempt.
 *
 * The final test runs against the REAL dev.css file as a regression guard for
 * the dev.css ↔ validate-theme coupling (T-005/T-007).
 */
import { describe, it, expect } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateTheme } from "./validate-theme.js";

// ---------------------------------------------------------------------------
// Helper: write a temporary CSS file and return its path.
// ---------------------------------------------------------------------------

let _tmpCounter = 0;
function writeTempCss(content: string): string {
  const path = join(tmpdir(), `validate-theme-test-${process.pid}-${_tmpCounter++}.css`);
  writeFileSync(path, content, "utf8");
  return path;
}

// ---------------------------------------------------------------------------
// Happy path — compliant fixture
// ---------------------------------------------------------------------------

describe("validateTheme() — compliant fixture", () => {
  it("returns valid:true and empty errors for a fully compliant theme", () => {
    const css = `
[data-theme="test"] {
  --dk-color-bg-base: rgb(11, 12, 17);
  --dk-color-bg-base: oklch(7.5% 0.015 265);
  --dk-color-accent-1: rgb(79, 179, 255);
  --dk-color-accent-1: oklch(74% 0.145 245);
}
    `.trim();
    const path = writeTempCss(css);
    const result = validateTheme(path);
    unlinkSync(path);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("alpha-only rgba props (no oklch) are NOT flagged", () => {
    const css = `
[data-theme="test"] {
  --dk-color-border: rgba(255, 255, 255, 0.08);
  --dk-color-overlay-bg: rgba(11, 12, 17, 0.9);
}
    `.trim();
    const path = writeTempCss(css);
    const result = validateTheme(path);
    unlinkSync(path);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("var()-alias syntax props are NOT flagged", () => {
    const css = `
[data-theme="test"] {
  --dk-color-syntax-keyword: var(--dk-color-accent-1);
  --dk-color-syntax-string: var(--dk-color-accent-2);
}
    `.trim();
    const path = writeTempCss(css);
    const result = validateTheme(path);
    unlinkSync(path);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Failure paths — violations
// ---------------------------------------------------------------------------

describe("validateTheme() — violations", () => {
  it("oklch decl with NO preceding rgb decl → valid:false naming the property", () => {
    const css = `
[data-theme="test"] {
  --dk-color-bg-base: oklch(7.5% 0.015 265);
}
    `.trim();
    const path = writeTempCss(css);
    const result = validateTheme(path);
    unlinkSync(path);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("--dk-color-bg-base");
    expect(result.errors[0]).toContain("missing rgb() fallback");
  });

  it("partial fixture: one prop ok, one missing rgb → only the bad prop in errors", () => {
    const css = `
[data-theme="test"] {
  --dk-color-bg-base: rgb(11, 12, 17);
  --dk-color-bg-base: oklch(7.5% 0.015 265);
  --dk-color-accent-1: oklch(74% 0.145 245);
}
    `.trim();
    const path = writeTempCss(css);
    const result = validateTheme(path);
    unlinkSync(path);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("--dk-color-accent-1");
    // The good prop must NOT appear in errors
    expect(result.errors.join("")).not.toContain("--dk-color-bg-base");
  });

  it("multiple bad props → one error entry per bad prop", () => {
    const css = `
[data-theme="test"] {
  --dk-color-bg-base: oklch(7.5% 0.015 265);
  --dk-color-accent-1: oklch(74% 0.145 245);
}
    `.trim();
    const path = writeTempCss(css);
    const result = validateTheme(path);
    unlinkSync(path);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    const combined = result.errors.join(" ");
    expect(combined).toContain("--dk-color-bg-base");
    expect(combined).toContain("--dk-color-accent-1");
  });
});

// ---------------------------------------------------------------------------
// Regression guard: real dev.css must be valid
// ---------------------------------------------------------------------------

describe("validateTheme() — regression guard on real dev.css", () => {
  it("packages/design-system/src/themes/dev/dev.css passes validation", () => {
    // Resolve the path relative to this test file's location (src/)
    const devCssPath = new URL(
      "./themes/dev/dev.css",
      import.meta.url,
    ).pathname;

    const result = validateTheme(devCssPath);

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });
});
