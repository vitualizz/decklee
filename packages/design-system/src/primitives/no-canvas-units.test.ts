/**
 * NFR-07: No canvas-relative units (vw, vh) or @media queries in any
 * .astro primitive. Primitives must be layout-container agnostic — the viewer
 * controls the canvas, not the primitive.
 *
 * Reads each *.astro file as a raw string and asserts it contains none of the
 * forbidden patterns.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PRIMITIVES_DIR = new URL(".", import.meta.url).pathname;

const FORBIDDEN = /\bvw\b|\bvh\b|@media/;

const astroFiles = readdirSync(PRIMITIVES_DIR).filter((f) =>
  f.endsWith(".astro"),
);

describe("no-canvas-units — NFR-07", () => {
  it("there are .astro files to test (guard against empty discovery)", () => {
    expect(astroFiles.length).toBeGreaterThan(0);
  });

  for (const file of astroFiles) {
    it(`${file} contains no vw, vh, or @media`, () => {
      const content = readFileSync(join(PRIMITIVES_DIR, file), "utf8");
      expect(content).not.toMatch(FORBIDDEN);
    });
  }
});
