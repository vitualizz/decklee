/**
 * generate-contract.ts — writes the committed AI-assistant contract files to
 * the repo root and refreshes the init-scaffold skill snapshot. Runs via
 * `node --experimental-strip-types scripts/generate-contract.ts`.
 *
 * It imports the generators from the COMPILED dist/ (the `build` script runs
 * before `generate:agents-md`), so this script never depends on TS-resolving
 * the .ts sources directly.
 *
 * The drift-check test re-runs the same generators in-proc and diffs against
 * the files this script writes — so these files MUST be committed (R7).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAgentsMd } from "../dist/generator/agents-md.js";
import { generateSkillWrappers } from "../dist/generator/skill-wrappers.js";

// packages/cli/scripts/ → up 3 → repo root.
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
// packages/cli/scripts/ → up 1 → packages/cli/
const cliRoot = fileURLToPath(new URL("../", import.meta.url));

const LLMS_TXT = `# DeckLee

> AI-assistant reference for creating validated presentation decks as JSON.

- AGENTS.md: /AGENTS.md
- Skill (generic): /skills/generic/AGENTS.md
- Skill (Claude): /skills/claude/SKILL.md
`;

function write(absPath: string, content: string): void {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content, "utf-8");
  process.stdout.write(`Generated: ${absPath}\n`);
}

const agentsMd = generateAgentsMd();
const wrappers = generateSkillWrappers();

// Committed repo-root contract files (drift-checked).
write(`${repoRoot}AGENTS.md`, agentsMd);
write(`${repoRoot}llms.txt`, LLMS_TXT);
write(`${repoRoot}skills/generic/AGENTS.md`, wrappers.generic["AGENTS.md"]);
write(`${repoRoot}skills/generic/README.md`, wrappers.generic["README.md"]);
write(`${repoRoot}skills/claude/SKILL.md`, wrappers.claude["SKILL.md"]);
write(`${repoRoot}skills/claude/README.md`, wrappers.claude["README.md"]);

// Keep the init-scaffold skill snapshot in sync with the same generator output.
const scaffoldSkill = `${cliRoot}templates/init-scaffold/skill/`;
write(`${scaffoldSkill}AGENTS.md`, wrappers.generic["AGENTS.md"]);
write(`${scaffoldSkill}README.md`, wrappers.generic["README.md"]);
write(`${scaffoldSkill}SKILL.md`, wrappers.claude["SKILL.md"]);
