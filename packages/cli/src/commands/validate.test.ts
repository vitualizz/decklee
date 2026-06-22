/**
 * T-023 — validate.test.ts
 * Tests for `runValidate()` (decklee validate <file> [--kind]).
 *
 * The function is async and returns an exit code (0, 1, 2).
 * We test behaviour by calling runValidate() directly, capturing stdout/stderr.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { runValidate } from "./validate.js";

// ─── fixture helpers ─────────────────────────────────────────────────────────

const fixtureDir = fileURLToPath(new URL("../__fixtures__", import.meta.url));

function fixture(name: string): string {
  return join(fixtureDir, name);
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

// ─── happy paths ─────────────────────────────────────────────────────────────

describe("runValidate — happy paths", () => {
  it("valid-deck.json → exit 0 with success message", async () => {
    const code = await runValidate(fixture("valid-deck.json"), {});
    expect(code).toBe(0);
    const out = stdoutOutput.join("");
    expect(out).toContain("✓");
    expect(out.toLowerCase()).toContain("deck");
  });

  it("valid-outline.json → exit 0 with success message", async () => {
    const code = await runValidate(fixture("valid-outline.json"), {});
    expect(code).toBe(0);
    const out = stdoutOutput.join("");
    expect(out).toContain("✓");
    expect(out.toLowerCase()).toContain("outline");
  });

  it("valid-deck.json with --kind deck override → exit 0", async () => {
    const code = await runValidate(fixture("valid-deck.json"), { kind: "deck" });
    expect(code).toBe(0);
  });

  it("valid-outline.json with --kind outline override → exit 0", async () => {
    const code = await runValidate(fixture("valid-outline.json"), { kind: "outline" });
    expect(code).toBe(0);
  });
});

// ─── auto-detect kind ────────────────────────────────────────────────────────

describe("runValidate — kind auto-detection", () => {
  it("file with slides → auto-detected as deck", async () => {
    const code = await runValidate(fixture("valid-deck.json"), {});
    expect(code).toBe(0);
    expect(stdoutOutput.join("")).toContain("deck");
  });

  it("file with sections → auto-detected as outline", async () => {
    const code = await runValidate(fixture("valid-outline.json"), {});
    expect(code).toBe(0);
    expect(stdoutOutput.join("")).toContain("outline");
  });
});

// ─── failure paths ───────────────────────────────────────────────────────────

describe("runValidate — invalid inputs", () => {
  it("invalid-deck.json (banned style key HC-03) → exit 1 with human-readable error table", async () => {
    const code = await runValidate(fixture("invalid-deck.json"), {});
    expect(code).toBe(1);
    const out = stdoutOutput.join("");
    // Should print the path | code | message table header
    expect(out).toContain("Path");
    expect(out).toContain("Code");
    expect(out).toContain("Message");
  });

  it("invalid-deck.json → error table has at least 1 error row", async () => {
    await runValidate(fixture("invalid-deck.json"), {});
    const out = stdoutOutput.join("");
    const lines = out.split("\n").filter((l) => l.trim().length > 0);
    // At least 2 lines: header + one error
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it("malformed.json → exit 1 with JSON_PARSE_ERROR on stderr", async () => {
    const code = await runValidate(fixture("malformed.json"), {});
    expect(code).toBe(1);
    const errOut = stderrOutput.join("");
    expect(errOut).toContain("JSON_PARSE_ERROR");
  });

  it("non-existent file → exit 2 with IO_ERROR on stderr", async () => {
    const code = await runValidate("/tmp/decklee-nonexistent-file-xyz.json", {});
    expect(code).toBe(2);
    const errOut = stderrOutput.join("");
    expect(errOut).toContain("IO_ERROR");
  });
});

// ─── --kind override ─────────────────────────────────────────────────────────

describe("runValidate — --kind override", () => {
  it("--kind deck forces deck path even on outline file → exits 1 (schema mismatch)", async () => {
    // outline-valid has sections, not slides → will fail deck validation
    const code = await runValidate(fixture("valid-outline.json"), { kind: "deck" });
    expect(code).toBe(1);
  });

  it("--kind outline forces outline path even on deck file → exits 1 (schema mismatch)", async () => {
    // valid-deck has slides, not sections → will fail outline validation
    const code = await runValidate(fixture("valid-deck.json"), { kind: "outline" });
    expect(code).toBe(1);
  });
});

// ─── UNKNOWN_KIND ─────────────────────────────────────────────────────────────

describe("runValidate — UNKNOWN_KIND", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "decklee-validate-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("valid JSON with neither slides nor sections → exit 1 with UNKNOWN_KIND on stderr", async () => {
    const ambiguousFile = join(tmpDir, "ambiguous.json");
    writeFileSync(ambiguousFile, JSON.stringify({ foo: "bar", schema_version: "1" }), "utf-8");

    const code = await runValidate(ambiguousFile, {});
    expect(code).toBe(1);
    const errOut = stderrOutput.join("");
    expect(errOut).toContain("UNKNOWN_KIND");
  });
});
