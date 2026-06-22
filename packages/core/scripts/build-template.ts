/**
 * Disk-writer for the standalone template + HC-04 size gates.
 *
 * Run via `node --experimental-strip-types scripts/build-template.ts` (Node 22+)
 * or `tsx scripts/build-template.ts`. This file is NOT tsc-compiled (excluded
 * from tsconfig.json), so it imports the .ts source directly.
 *
 * The external-url() CSS scan runs automatically inside assembleTemplate(); the
 * size gates and the disk write live here.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { assembleTemplate } from "../src/assemble.ts";

const SOFT_LIMIT_BYTES = 800_000;
const HARD_LIMIT_BYTES = 2_000_000;

function assertViewerDist(): void {
  // ESM resolution (see assemble.ts): the viewer's exports map is import-only,
  // so createRequire(...).resolve cannot read it.
  const viewerDist = fileURLToPath(import.meta.resolve("@decklee/viewer"));
  if (!existsSync(viewerDist)) {
    console.error("viewer dist not found — run 'pnpm -r build' first");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  assertViewerDist();

  const html = await assembleTemplate();
  const bytes = Buffer.byteLength(html, "utf-8");

  if (bytes > SOFT_LIMIT_BYTES) {
    console.warn(
      `WARN: template size ${bytes} bytes exceeds 800kB soft threshold`,
    );
  }
  if (bytes > HARD_LIMIT_BYTES) {
    console.error(
      `FAIL: template size ${bytes} bytes exceeds 2MB hard limit (HC-04)`,
    );
    process.exit(1);
  }

  const distDir = fileURLToPath(new URL("../dist", import.meta.url));
  mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, "decklee-template.html"), html, "utf-8");

  console.log(`decklee-template.html written (${bytes} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
