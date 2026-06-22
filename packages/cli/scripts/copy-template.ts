/**
 * copy-template.ts — copies the pre-built viewer template from @decklee/core's
 * build output into this package's templates/ dir, so the CLI can ship it and
 * resolve it at runtime (no assembleTemplate() at user time, NFR-8).
 *
 * Runs as the first step of the CLI `build` script via
 * `node --experimental-strip-types`.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// packages/cli/scripts/ → up 2 → packages/cli ; up 3 → packages ; up 4 → repo root.
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const source = `${repoRoot}packages/core/dist/decklee-template.html`;
const dest = `${repoRoot}packages/cli/templates/decklee-template.html`;

if (!existsSync(source)) {
  process.stderr.write(
    `copy-template: ${source} is missing.\n` +
      `Build the core template first: pnpm -F @decklee/core build && pnpm -F @decklee/core build-template\n`,
  );
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(source, dest);
process.stdout.write(`Copied template → ${dest}\n`);
