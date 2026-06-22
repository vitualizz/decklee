/**
 * T-025 — drift-check.test.ts (RELEASE GATE — CI-01 + CI-02)
 *
 * Asserts that the committed contract files at the repo root are byte-identical
 * to what generateAgentsMd() / generateSkillWrappers() produce right now.
 *
 * RUN LAST: this test is the release gate. It passes only when T-020 (the
 * generate:agents-md run) has been executed and its output committed to the repo.
 *
 * If any assertion fails, the fix is:
 *   pnpm --filter decklee generate:agents-md
 * then commit the regenerated files.
 *
 * repoRoot uses `new URL("../../../../", import.meta.url)` — vitest runs the
 * .ts source in place; packages/cli/src/ → up 4 levels → repo root. This is
 * different from generate-contract.ts (scripts/ → 3 levels).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "@decklee/schema";
import { generateAgentsMd } from "./generator/agents-md.js";
import { generateSkillWrappers } from "./generator/skill-wrappers.js";

const REGEN_CMD = "pnpm --filter decklee generate:agents-md";

// NOTE: repoRootFromTest() in paths.ts uses "../../../../" which is 4 levels
// up from packages/cli/src/paths.ts, landing at VituLabs/ (one level too high).
// The correct path from packages/cli/src/ is 3 levels up to the repo root.
// We compute it directly here to avoid that bug (recorded in open_items).
// drift-check.test.ts is at packages/cli/src/drift-check.test.ts:
//   ../    = packages/cli/src/  → packages/cli/
//   ../../  = packages/
//   ../../../ = decklee/ (repo root)
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

// ─── CI-02 Test 1: /AGENTS.md ────────────────────────────────────────────────

describe("CI-02 drift-check: /AGENTS.md", () => {
  it("committed /AGENTS.md is byte-identical to generateAgentsMd() in-process", () => {
    const committedPath = join(repoRoot, "AGENTS.md");
    expect(
      existsSync(committedPath),
      `Missing committed file: ${committedPath}. Run: ${REGEN_CMD}`,
    ).toBe(true);

    const committed = readFileSync(committedPath, "utf-8");
    const generated = generateAgentsMd();

    expect(
      committed,
      `DRIFT DETECTED in /AGENTS.md — the committed file differs from the in-process generator output.\nFix: Run: ${REGEN_CMD}\nthen commit the regenerated files.`,
    ).toBe(generated);
  });
});

// ─── CI-02 Test 2: /skills/generic/AGENTS.md ─────────────────────────────────

describe("CI-02 drift-check: /skills/generic/AGENTS.md", () => {
  it("committed /skills/generic/AGENTS.md is byte-identical to generateSkillWrappers().generic['AGENTS.md']", () => {
    const committedPath = join(repoRoot, "skills", "generic", "AGENTS.md");
    expect(
      existsSync(committedPath),
      `Missing committed file: ${committedPath}. Run: ${REGEN_CMD}`,
    ).toBe(true);

    const committed = readFileSync(committedPath, "utf-8");
    const generated = generateSkillWrappers().generic["AGENTS.md"];

    expect(
      committed,
      `DRIFT DETECTED in /skills/generic/AGENTS.md — the committed file differs from the in-process generator output.\nFix: Run: ${REGEN_CMD}\nthen commit the regenerated files.`,
    ).toBe(generated);
  });
});

// ─── CI-02 Test 3: /skills/claude/SKILL.md ───────────────────────────────────

describe("CI-02 drift-check: /skills/claude/SKILL.md", () => {
  it("committed /skills/claude/SKILL.md is byte-identical to generateSkillWrappers().claude['SKILL.md']", () => {
    const committedPath = join(repoRoot, "skills", "claude", "SKILL.md");
    expect(
      existsSync(committedPath),
      `Missing committed file: ${committedPath}. Run: ${REGEN_CMD}`,
    ).toBe(true);

    const committed = readFileSync(committedPath, "utf-8");
    const generated = generateSkillWrappers().claude["SKILL.md"];

    expect(
      committed,
      `DRIFT DETECTED in /skills/claude/SKILL.md — the committed file differs from the in-process generator output.\nFix: Run: ${REGEN_CMD}\nthen commit the regenerated files.`,
    ).toBe(generated);
  });
});

// ─── CI-01 Test 4: AGENTS.md version header == SCHEMA_VERSION ────────────────

describe("CI-01: committed /AGENTS.md version header == SCHEMA_VERSION", () => {
  it("AGENTS.md <!-- decklee-agents-md-version: {v} --> header matches SCHEMA_VERSION", () => {
    const committedPath = join(repoRoot, "AGENTS.md");
    expect(
      existsSync(committedPath),
      `Missing committed file: ${committedPath}. Run: ${REGEN_CMD}`,
    ).toBe(true);

    const content = readFileSync(committedPath, "utf-8");
    const match = content.match(/<!--\s*decklee-agents-md-version:\s*(\S+)\s*-->/);
    expect(
      match,
      `Could not find version comment in /AGENTS.md. Expected: <!-- decklee-agents-md-version: {v} -->`,
    ).toBeTruthy();

    const embeddedVersion = match![1];
    expect(
      embeddedVersion,
      `Version mismatch: /AGENTS.md says "${embeddedVersion}" but SCHEMA_VERSION is "${SCHEMA_VERSION}". Run: ${REGEN_CMD}`,
    ).toBe(SCHEMA_VERSION);
  });
});
