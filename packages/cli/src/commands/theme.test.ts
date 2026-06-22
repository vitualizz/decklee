/**
 * T-021 — theme.test.ts
 * Tests for `runTheme()` (decklee theme list).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runTheme } from "./theme.js";

describe("runTheme", () => {
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

  it('theme list → contains "dev", exits 0', () => {
    const code = runTheme("list");
    expect(code).toBe(0);
    const combined = stdoutOutput.join("");
    expect(combined).toContain("dev");
  });

  it("theme list → exit 0 (sync)", () => {
    const code = runTheme("list");
    expect(code).toBe(0);
  });

  it("runTheme(undefined) → exit 1 (no subcommand)", () => {
    const code = runTheme(undefined);
    expect(code).toBe(1);
  });

  it('runTheme("unknown") → exit 1 (unknown subcommand)', () => {
    const code = runTheme("unknown");
    expect(code).toBe(1);
  });

  it("runTheme(undefined) → prints usage to stderr", () => {
    runTheme(undefined);
    const combined = stderrOutput.join("");
    expect(combined.toLowerCase()).toContain("usage");
  });
});
