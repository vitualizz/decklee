/**
 * T-022 — generator.test.ts
 * Tests for generateAgentsMd(), generateCheatsheet(), and generateSkillWrappers().
 * Also validates the few-shot examples against the schema.
 */
import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { generateAgentsMd } from "./agents-md.js";
import { generateCheatsheet } from "./cheatsheet.js";
import { generateSkillWrappers } from "./skill-wrappers.js";
import { safeValidateDeck, safeValidateOutline, SCHEMA_VERSION } from "@decklee/schema";

// ─── helpers ────────────────────────────────────────────────────────────────

function loadExample(name: string): unknown {
  const dir = fileURLToPath(new URL("../examples", import.meta.url));
  return JSON.parse(readFileSync(`${dir}/${name}`, "utf-8"));
}

// ─── generateAgentsMd ────────────────────────────────────────────────────────

describe("generateAgentsMd()", () => {
  it("is deterministic — two calls produce byte-identical strings", () => {
    const first = generateAgentsMd();
    const second = generateAgentsMd();
    expect(first).toBe(second);
  });

  it('contains all 4 layout section headers: hero, two-up, code, quote', () => {
    const output = generateAgentsMd();
    expect(output).toContain("### hero");
    expect(output).toContain("### two-up");
    expect(output).toContain("### code");
    expect(output).toContain("### quote");
  });

  it("contains SCHEMA_VERSION header comment (CI-01)", () => {
    const output = generateAgentsMd();
    expect(output).toContain(`decklee-agents-md-version: ${SCHEMA_VERSION}`);
  });

  it('contains "dev" theme entry in the theme catalog', () => {
    const output = generateAgentsMd();
    expect(output).toContain("`dev`");
  });

  it("contains THE RULE section", () => {
    const output = generateAgentsMd();
    expect(output).toContain("## THE RULE");
    // Core content of the rule — no CSS/HTML
    expect(output).toContain("You emit ONLY validated Deck JSON");
  });

  it("contains PRIMITIVES REFERENCE section", () => {
    const output = generateAgentsMd();
    expect(output).toContain("## PRIMITIVES REFERENCE");
  });

  it("contains THEME CATALOG section", () => {
    const output = generateAgentsMd();
    expect(output).toContain("## THEME CATALOG");
  });

  it("contains VERSION PIN section", () => {
    const output = generateAgentsMd();
    expect(output).toContain("## VERSION PIN");
    expect(output).toContain(`schema version \`${SCHEMA_VERSION}\``);
  });

  // ── Hero prop tests (R2 — ZodEffects unwrap correctness guard) ────────────

  it("includes required Hero prop: headline", () => {
    const output = generateAgentsMd();
    // In the hero table there's a headline row
    expect(output).toContain("`headline`");
  });

  it("includes optional Hero props (R2 ZodEffects unwrap)", () => {
    const output = generateAgentsMd();
    // These are optional props that only appear if unwrapObject works
    expect(output).toContain("`subheadline`");
    expect(output).toContain("`eyebrow`");
    expect(output).toContain("`background_treatment`");
    expect(output).toContain("`image_src`");
    expect(output).toContain("`image_alt`");
    expect(output).toContain("`cta_label`");
  });

  it("Hero optional props appear as required=no in the table", () => {
    const output = generateAgentsMd();
    // Table format per row: | `subheadline` | `string` | no |
    // Split into lines and find the subheadline row
    const lines = output.split("\n");
    const subheadlineLine = lines.find((l) => l.includes("`subheadline`"));
    expect(subheadlineLine, "subheadline row not found in AGENTS.md output").toBeTruthy();
    expect(subheadlineLine).toContain("| no |");
  });

  it("Hero headline is required in the table", () => {
    const output = generateAgentsMd();
    const lines = output.split("\n");
    const headlineLine = lines.find((l) => l.includes("`headline`"));
    expect(headlineLine, "headline row not found in AGENTS.md output").toBeTruthy();
    expect(headlineLine).toContain("| yes |");
  });

  it("includes CONTENT CONSTRAINTS section with BANNED_KEYS", () => {
    const output = generateAgentsMd();
    expect(output).toContain("## CONTENT CONSTRAINTS");
    expect(output).toContain("HC-03");
    // style is a banned key
    expect(output).toContain("`style`");
  });
});

// ─── generateCheatsheet ──────────────────────────────────────────────────────

describe("generateCheatsheet()", () => {
  it("returns a non-empty string", () => {
    const output = generateCheatsheet();
    expect(output.length).toBeGreaterThan(0);
  });

  it("contains all 4 layout names", () => {
    const output = generateCheatsheet();
    expect(output).toContain("hero");
    expect(output).toContain("two-up");
    expect(output).toContain("code");
    expect(output).toContain("quote");
  });

  it("marks required props with ★", () => {
    const output = generateCheatsheet();
    expect(output).toContain("★");
  });

  it("marks optional props with ○", () => {
    const output = generateCheatsheet();
    expect(output).toContain("○");
  });
});

// ─── generateSkillWrappers ───────────────────────────────────────────────────

describe("generateSkillWrappers()", () => {
  it("generic['AGENTS.md'] === generateAgentsMd()", () => {
    const wrappers = generateSkillWrappers();
    expect(wrappers.generic["AGENTS.md"]).toBe(generateAgentsMd());
  });

  it("claude['SKILL.md'] starts with '---' (YAML frontmatter)", () => {
    const wrappers = generateSkillWrappers();
    expect(wrappers.claude["SKILL.md"]).toMatch(/^---/);
  });

  it("claude['SKILL.md'] contains the full AGENTS.md body", () => {
    const wrappers = generateSkillWrappers();
    const agentsMd = generateAgentsMd();
    expect(wrappers.claude["SKILL.md"]).toContain(agentsMd);
  });

  it("generic includes README.md", () => {
    const wrappers = generateSkillWrappers();
    expect(wrappers.generic["README.md"]).toBeTruthy();
  });

  it("claude includes README.md", () => {
    const wrappers = generateSkillWrappers();
    expect(wrappers.claude["README.md"]).toBeTruthy();
  });
});

// ─── Few-shot validation (AC-4) ──────────────────────────────────────────────

describe("Few-shot examples validate against schema (AC-4)", () => {
  it("deck-example-1.json passes safeValidateDeck", () => {
    const data = loadExample("deck-example-1.json");
    const result = safeValidateDeck(data);
    expect(result.ok, `Expected ok:true but got errors: ${result.ok ? "" : JSON.stringify((result as {ok:false; errors: unknown[]}).errors)}`).toBe(true);
  });

  it("deck-example-2.json passes safeValidateDeck", () => {
    const data = loadExample("deck-example-2.json");
    const result = safeValidateDeck(data);
    expect(result.ok, `Expected ok:true but got errors: ${result.ok ? "" : JSON.stringify((result as {ok:false; errors: unknown[]}).errors)}`).toBe(true);
  });

  it("outline-example-1.json passes safeValidateOutline", () => {
    const data = loadExample("outline-example-1.json");
    const result = safeValidateOutline(data);
    expect(result.ok, `Expected ok:true but got errors: ${result.ok ? "" : JSON.stringify((result as {ok:false; errors: unknown[]}).errors)}`).toBe(true);
  });
});
