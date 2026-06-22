/**
 * `decklee build <deck.json> [--out file] [--template file]` — validate a deck,
 * inject it into the bundled pre-built template, and write the rendered HTML.
 *
 * safeValidateDeck runs BEFORE emitDeck so a bad deck yields friendly
 * FieldError[] instead of injectDeck's throwing validateDeck (R3).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { emitDeck } from "@decklee/core";
import { safeValidateDeck, type FieldError } from "@decklee/schema";
import { resolveBundledTemplate } from "../paths.js";

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

  const validated = safeValidateDeck(parsed);
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

  process.stdout.write(`Built: ${outPath}\n`);
  return EXIT_OK;
}
