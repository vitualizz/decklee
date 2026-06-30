/**
 * init.test.ts — tests for `runInit()` (decklee init <name> [flags]).
 *
 * Interactive paths use an injected fake Prompter + isTTY in InitDeps, so no
 * real readline/TTY is ever touched. Filesystem effects land in mkdtemp temp
 * dirs. stdout/stderr are spied. We assert exit code + existsSync + JSON.parse.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { safeValidateOutline } from "@decklee/schema";
import { runInit, type InitOptions, type InitDeps } from "./init.js";
import type { Prompter } from "../prompt.js";

// ─── scripted fake prompter ──────────────────────────────────────────────────

class FakePrompter implements Prompter {
  private lines: string[];
  private choices: string[];
  constructor(answers: { lines?: string[]; choices?: string[] } = {}) {
    this.lines = [...(answers.lines ?? [])];
    this.choices = [...(answers.choices ?? [])];
  }
  async line(): Promise<string> {
    return this.lines.shift() ?? "";
  }
  async choice(): Promise<string> {
    return this.choices.shift() ?? "";
  }
  close(): void {
    /* no-op */
  }
}

// ─── shared I/O capture + temp dir ───────────────────────────────────────────

let stdoutOutput: string[];
let stderrOutput: string[];
let tmpDir: string;

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
  tmpDir = mkdtempSync(join(tmpdir(), "decklee-init-test-"));
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─── AC1: TTY happy path → scaffold + outline.json + deck.json, exit 0 ───────

describe("runInit — TTY happy path", () => {
  it("scripted prompts → folder + outline.json + deck.json created, exit 0", async () => {
    const prompter = new FakePrompter({
      lines: ["My Cool Deck", "Engineers", "confident", "dev"],
      choices: ["story"],
    });
    const deps: InitDeps = { isTTY: true, prompter, cwd: tmpDir };
    const code = await runInit({ name: "my-cool-deck" }, deps);

    const target = join(tmpDir, "my-cool-deck");
    expect(code).toBe(0);
    expect(existsSync(target)).toBe(true);
    expect(existsSync(join(target, "outline.json"))).toBe(true);
    expect(existsSync(join(target, "deck.json"))).toBe(true);
  });
});

// ─── AC2: non-TTY all flags → exit 0 ─────────────────────────────────────────

describe("runInit — non-TTY with all flags", () => {
  it("all flags supplied → exit 0, files created", async () => {
    const opts: InitOptions = {
      name: "deck-two",
      title: "Deck Two",
      audience: "Investors",
      tone: "calm",
      narrativeArc: "comparison",
      theme: "dev",
    };
    const code = await runInit(opts, { isTTY: false, cwd: tmpDir });
    const target = join(tmpDir, "deck-two");
    expect(code).toBe(0);
    expect(existsSync(join(target, "outline.json"))).toBe(true);
  });
});

// ─── AC3: non-TTY missing --audience → exit 1 + stderr lists missing ─────────

describe("runInit — non-TTY missing required flag", () => {
  it("missing --audience → exit 1, stderr names the missing flag", async () => {
    const code = await runInit(
      { name: "deck-three", tone: "calm", narrativeArc: "story" },
      { isTTY: false, cwd: tmpDir },
    );
    expect(code).toBe(1);
    expect(stderrOutput.join("")).toContain("--audience");
  });
});

// ─── AC4: collision non-empty, no --force → exit 1 ───────────────────────────

describe("runInit — collision without --force", () => {
  it("non-empty target, no --force → exit 1", async () => {
    const target = join(tmpDir, "deck-four");
    mkdirSync(target);
    writeFileSync(join(target, "preexisting.txt"), "hi", "utf-8");

    const code = await runInit(
      { name: "deck-four", audience: "X", tone: "Y", narrativeArc: "story" },
      { isTTY: false, cwd: tmpDir },
    );
    expect(code).toBe(1);
    expect(stderrOutput.join("")).toContain("USER_ERROR");
  });
});

// ─── AC5: collision with --force → exit 0 ────────────────────────────────────

describe("runInit — collision with --force", () => {
  it("non-empty target + --force → exit 0", async () => {
    const target = join(tmpDir, "deck-five");
    mkdirSync(target);
    writeFileSync(join(target, "preexisting.txt"), "hi", "utf-8");

    const code = await runInit(
      { name: "deck-five", audience: "X", tone: "Y", narrativeArc: "story", force: true },
      { isTTY: false, cwd: tmpDir },
    );
    expect(code).toBe(0);
    expect(existsSync(join(target, "outline.json"))).toBe(true);
  });
});

// ─── AC6: unknown --theme → exit 1 ───────────────────────────────────────────

describe("runInit — unknown theme", () => {
  it("unknown --theme → exit 1", async () => {
    const code = await runInit(
      { name: "deck-six", audience: "X", tone: "Y", narrativeArc: "story", theme: "nope" },
      { isTTY: false, cwd: tmpDir },
    );
    expect(code).toBe(1);
    expect(stderrOutput.join("")).toContain("Unknown theme");
  });
});

// ─── AC7: invalid --narrative-arc → exit 1 ───────────────────────────────────

describe("runInit — invalid narrative arc", () => {
  it("invalid --narrative-arc → exit 1", async () => {
    const code = await runInit(
      { name: "deck-seven", audience: "X", tone: "Y", narrativeArc: "hero-journey" },
      { isTTY: false, cwd: tmpDir },
    );
    expect(code).toBe(1);
    expect(stderrOutput.join("")).toContain("Unknown narrative arc");
  });
});

// ─── AC8: success integrity — outline valid + ids linked + title patched ─────

describe("runInit — success integrity", () => {
  it("outline validates, outline.id === deck.meta.source_outline_id, title patched", async () => {
    const code = await runInit(
      {
        name: "deck-eight",
        title: "Eighth Deck",
        audience: "Team",
        tone: "urgent",
        narrativeArc: "thesis-support",
        theme: "dev",
      },
      { isTTY: false, cwd: tmpDir },
    );
    expect(code).toBe(0);

    const target = join(tmpDir, "deck-eight");
    const outline = JSON.parse(readFileSync(join(target, "outline.json"), "utf-8"));
    const deck = JSON.parse(readFileSync(join(target, "deck.json"), "utf-8"));

    expect(safeValidateOutline(outline).ok).toBe(true);
    expect(outline.id).toBe(deck.meta.source_outline_id);
    expect(deck.meta.title).toBe("Eighth Deck");
    expect(deck.meta.theme_id).toBe("dev");
    expect(outline.meta.narrative_arc).toBe("thesis-support");
  });
});
