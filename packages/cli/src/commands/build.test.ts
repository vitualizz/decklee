/**
 * T-024 — build.test.ts
 * Tests for `runBuild()` (decklee build <deck.json> [--out file] [--template file]).
 *
 * The bundled template (packages/cli/templates/decklee-template.html) must be
 * present. It is shipped in the repo (gitignored but copy-template.ts copies it
 * during build). The dist/ compiled CLI must exist too for resolveBundledTemplate()
 * to resolve correctly at runtime.
 *
 * Note: runBuild() imports resolveBundledTemplate() which resolves from dist/paths.js.
 * Because vitest runs the .ts source in place (NOT dist/), the path math differs.
 * We therefore pass --template explicitly in all build tests that need the real template.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { runBuild } from "./build.js";

// ─── fixture & template helpers ──────────────────────────────────────────────

const fixtureDir = fileURLToPath(new URL("../__fixtures__", import.meta.url));
// Reach the bundled template. vitest runs source files in-place, so
// import.meta.url is packages/cli/src/commands/build.test.ts.
// ../../templates relative to src/commands/ → packages/cli/templates/
const bundledTemplate = fileURLToPath(
  new URL("../../templates/decklee-template.html", import.meta.url),
);

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

// ─── happy path: valid deck → HTML output ────────────────────────────────────

describe("runBuild — happy path: valid deck → HTML output", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "decklee-build-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("valid-deck.json → exit 0, HTML file written", async () => {
    const outPath = join(tmpDir, "out.html");
    const code = await runBuild(fixture("valid-deck.json"), {
      template: bundledTemplate,
      out: outPath,
    });
    expect(code).toBe(0);
    expect(existsSync(outPath)).toBe(true);
  });

  it("valid-deck.json → HTML contains decklee-deck JSON island", async () => {
    const outPath = join(tmpDir, "out.html");
    await runBuild(fixture("valid-deck.json"), {
      template: bundledTemplate,
      out: outPath,
    });
    const html = readFileSync(outPath, "utf-8");
    expect(html).toContain("decklee-deck");
  });

  it("valid-deck.json → the decklee-deck JSON island round-trips to valid JSON", async () => {
    const outPath = join(tmpDir, "out.html");
    await runBuild(fixture("valid-deck.json"), {
      template: bundledTemplate,
      out: outPath,
    });
    const html = readFileSync(outPath, "utf-8");
    // Extract JSON from the island: <script type="application/json" id="decklee-deck">{...}</script>
    const match = html.match(/<script[^>]+id="decklee-deck"[^>]*>([\s\S]*?)<\/script>/);
    expect(match, "decklee-deck island not found in HTML output").toBeTruthy();
    const jsonStr = match![1];
    const parsed = JSON.parse(jsonStr);
    expect(parsed).toBeDefined();
    // The deck JSON should have slides
    expect(Array.isArray(parsed.slides)).toBe(true);
  });

  it("valid-deck.json → prints 'Built:' to stdout, exit 0", async () => {
    const outPath = join(tmpDir, "out.html");
    await runBuild(fixture("valid-deck.json"), {
      template: bundledTemplate,
      out: outPath,
    });
    expect(stdoutOutput.join("")).toContain("Built:");
  });

  it("--out custom path → HTML written to custom path", async () => {
    const customOut = join(tmpDir, "custom-output.html");
    const code = await runBuild(fixture("valid-deck.json"), {
      template: bundledTemplate,
      out: customOut,
    });
    expect(code).toBe(0);
    expect(existsSync(customOut)).toBe(true);
  });
});

// ─── failure: invalid deck → exit 1, no file written ────────────────────────

describe("runBuild — failure: invalid deck", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "decklee-build-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("invalid-deck.json → exit 1 with VALIDATION_ERROR on stderr", async () => {
    const outPath = join(tmpDir, "should-not-exist.html");
    const code = await runBuild(fixture("invalid-deck.json"), {
      template: bundledTemplate,
      out: outPath,
    });
    expect(code).toBe(1);
    const errOut = stderrOutput.join("");
    expect(errOut).toContain("VALIDATION_ERROR");
  });

  it("invalid-deck.json → VALIDATION_ERROR includes details array on stderr", async () => {
    const outPath = join(tmpDir, "should-not-exist.html");
    await runBuild(fixture("invalid-deck.json"), {
      template: bundledTemplate,
      out: outPath,
    });
    const errOut = stderrOutput.join("");
    const envelope = JSON.parse(errOut.trim());
    expect(Array.isArray(envelope.error.details)).toBe(true);
    expect(envelope.error.details.length).toBeGreaterThanOrEqual(1);
  });

  it("invalid-deck.json → no file written on exit 1", async () => {
    const outPath = join(tmpDir, "should-not-exist.html");
    await runBuild(fixture("invalid-deck.json"), {
      template: bundledTemplate,
      out: outPath,
    });
    expect(existsSync(outPath)).toBe(false);
  });
});

// ─── failure: malformed JSON → exit 1, JSON_PARSE_ERROR ─────────────────────

describe("runBuild — failure: malformed JSON", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "decklee-build-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("malformed.json → exit 1 with JSON_PARSE_ERROR on stderr", async () => {
    const outPath = join(tmpDir, "should-not-exist.html");
    const code = await runBuild(fixture("malformed.json"), {
      template: bundledTemplate,
      out: outPath,
    });
    expect(code).toBe(1);
    const errOut = stderrOutput.join("");
    expect(errOut).toContain("JSON_PARSE_ERROR");
  });
});

// ─── failure: missing template → exit 2, IO_ERROR ───────────────────────────

describe("runBuild — failure: missing template → exit 2", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "decklee-build-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("--template pointing to nonexistent file → exit 2 with IO_ERROR", async () => {
    const outPath = join(tmpDir, "out.html");
    const code = await runBuild(fixture("valid-deck.json"), {
      template: "/tmp/decklee-nonexistent-template-xyz.html",
      out: outPath,
    });
    expect(code).toBe(2);
    const errOut = stderrOutput.join("");
    expect(errOut).toContain("IO_ERROR");
  });
});

// ─── failure: nonexistent input file → exit 2, IO_ERROR ─────────────────────

describe("runBuild — failure: nonexistent input file → exit 2", () => {
  it("nonexistent file → exit 2 with IO_ERROR on stderr", async () => {
    const code = await runBuild("/tmp/decklee-nonexistent-deck-xyz.json", {
      template: bundledTemplate,
    });
    expect(code).toBe(2);
    const errOut = stderrOutput.join("");
    expect(errOut).toContain("IO_ERROR");
  });
});
