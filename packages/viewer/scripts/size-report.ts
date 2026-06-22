/**
 * Bundle size report (CI-04 measurement). Reads the built artifacts in dist/
 * and prints their byte counts as JSON to stdout. The viewer only MEASURES;
 * @decklee/core owns the budget threshold and enforcement.
 *
 * Run after a build: `pnpm -F @decklee/viewer size-report`.
 */
import { existsSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(scriptDir, "..");
const distDir = join(packageRoot, "dist");

const REPORT_TARGETS = ["index.js", "index.d.ts"];

function main(): void {
  if (!existsSync(distDir)) {
    console.error(
      "size-report: dist/ not found — run `pnpm -F @decklee/viewer build` first.",
    );
    process.exit(1);
  }

  const report: Record<string, number> = {};
  for (const target of REPORT_TARGETS) {
    const fullPath = join(distDir, target);
    if (!existsSync(fullPath)) {
      continue;
    }
    const key = relative(packageRoot, fullPath);
    report[key] = statSync(fullPath).size;
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main();
