/**
 * `decklee build <deck.json> [--out file] [--template file]` — validate a deck,
 * inject it into the bundled pre-built template, and write the rendered HTML.
 *
 * safeValidateDeck runs BEFORE emitDeck so a bad deck yields friendly
 * FieldError[] instead of injectDeck's throwing validateDeck (R3).
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { emitDeck } from "@decklee/core";
import { safeValidateDeck, type FieldError } from "@decklee/schema";
import { resolveBundledTemplate } from "../paths.js";
import {
  inlineImages,
  InlinerError,
  TOTAL_HTML_ADVISORY_BYTES,
  TOTAL_HTML_ESCALATED_BYTES,
} from "../inline-images.js";

/** Human-readable byte size for advisory output, e.g. "16.2 MB". */
function humanBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const EXIT_OK = 0;
const EXIT_USER = 1;
const EXIT_IO = 2;

type ErrorCode = "IO_ERROR" | "JSON_PARSE_ERROR" | "VALIDATION_ERROR";

function printErrorEnvelope(code: ErrorCode, message: string, details?: FieldError[]): void {
  const error: { code: ErrorCode; message: string; details?: FieldError[] } = { code, message };
  if (details && details.length > 0) {
    error.details = details;
  }
  process.stderr.write(`${JSON.stringify({ error })}\n`);
}

export async function runBuild(
  file: string,
  opts: { template?: string; out?: string },
): Promise<number> {
  let raw: string;
  try {
    raw = readFileSync(file, "utf-8");
  } catch (caught) {
    printErrorEnvelope("IO_ERROR", `Could not read ${file}: ${(caught as Error).message}`);
    return EXIT_IO;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (caught) {
    printErrorEnvelope("JSON_PARSE_ERROR", `${file} is not valid JSON: ${(caught as Error).message}`);
    return EXIT_USER;
  }

  // --- IMAGE INLINER (NEW) — inline → validate → emit invariant (ADR D1) ---
  let inlined: unknown;
  try {
    const result = inlineImages(parsed, file);
    inlined = result.data;
    for (const w of result.warnings) {
      process.stderr.write(`warning: ${w.message}\n`); // plain text, NOT JSON envelope (D3)
    }
  } catch (caught) {
    if (caught instanceof InlinerError) {
      printErrorEnvelope(caught.code, caught.message);
      return caught.code === "IO_ERROR" ? EXIT_IO : EXIT_USER;
    }
    printErrorEnvelope("IO_ERROR", `Image inlining failed: ${(caught as Error).message}`);
    return EXIT_IO;
  }

  const validated = safeValidateDeck(inlined);
  if (!validated.ok) {
    printErrorEnvelope("VALIDATION_ERROR", `${file} failed schema validation.`, validated.errors);
    return EXIT_USER;
  }

  const templatePath = opts.template ?? resolveBundledTemplate();
  if (!existsSync(templatePath)) {
    printErrorEnvelope("IO_ERROR", `Template not found at ${templatePath}.`);
    return EXIT_IO;
  }

  let html: string;
  try {
    html = await emitDeck(validated.data, { templatePath });
  } catch (caught) {
    printErrorEnvelope("IO_ERROR", `Failed to render deck: ${(caught as Error).message}`);
    return EXIT_IO;
  }

  const outPath =
    opts.out ?? resolve(dirname(file), basename(file).replace(/\.json$/, ".html"));
  try {
    writeFileSync(outPath, html, "utf-8");
  } catch (caught) {
    printErrorEnvelope("IO_ERROR", `Could not write ${outPath}: ${(caught as Error).message}`);
    return EXIT_IO;
  }

  // --- POST-BUILD TOTAL-HTML SIZE ADVISORY (NFR-2) — never blocks a build ---
  try {
    const htmlBytes = statSync(outPath).size;
    if (htmlBytes >= TOTAL_HTML_ESCALATED_BYTES) {
      process.stderr.write(
        `warning: output ${outPath} is ${humanBytes(htmlBytes)} (> 20MB) — ` +
          `this HTML may be slow to open/share; resize large images.\n`,
      );
    } else if (htmlBytes >= TOTAL_HTML_ADVISORY_BYTES) {
      process.stderr.write(
        `warning: output ${outPath} is ${humanBytes(htmlBytes)} (> 15MB) — ` +
          `consider resizing large images.\n`,
      );
    }
  } catch {
    /* stat failure is non-fatal; never blocks a successful build */
  }

  process.stdout.write(`Built: ${outPath}\n`);
  return EXIT_OK;
}
