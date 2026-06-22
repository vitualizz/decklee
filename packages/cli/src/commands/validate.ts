/**
 * `decklee validate <file> [--kind deck|outline]` — non-throwing validation
 * that prints a human-readable error table and returns an exit code.
 */
import { readFileSync } from "node:fs";
import {
  safeValidateDeck,
  safeValidateOutline,
  type FieldError,
} from "@decklee/schema";

const EXIT_OK = 0;
const EXIT_USER = 1;
const EXIT_IO = 2;

type ErrorCode = "IO_ERROR" | "JSON_PARSE_ERROR" | "UNKNOWN_KIND";

function printErrorEnvelope(code: ErrorCode, message: string): void {
  process.stderr.write(`${JSON.stringify({ error: { code, message } })}\n`);
}

function printFieldErrorTable(errors: FieldError[]): void {
  const rows = errors.map((e) => `${e.path || "(root)"}  |  ${e.code}  |  ${e.message}`);
  process.stdout.write(`Path  |  Code  |  Message\n${rows.join("\n")}\n`);
}

function detectKind(parsed: unknown, override?: string): "deck" | "outline" | undefined {
  if (override === "deck" || override === "outline") {
    return override;
  }
  if (parsed !== null && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.slides)) {
      return "deck";
    }
    if (Array.isArray(obj.sections)) {
      return "outline";
    }
  }
  return undefined;
}

export async function runValidate(
  file: string,
  opts: { kind?: string },
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

  const kind = detectKind(parsed, opts.kind);
  if (kind === undefined) {
    printErrorEnvelope(
      "UNKNOWN_KIND",
      "Could not determine kind — expected a `slides` (deck) or `sections` (outline) array, or pass --kind.",
    );
    return EXIT_USER;
  }

  if (kind === "deck") {
    const result = safeValidateDeck(parsed);
    if (result.ok) {
      process.stdout.write(`✓ Valid deck JSON — ${result.data.slides.length} slides\n`);
      return EXIT_OK;
    }
    printFieldErrorTable(result.errors);
    return EXIT_USER;
  }

  const result = safeValidateOutline(parsed);
  if (result.ok) {
    const beatCount = result.data.sections.reduce((sum, s) => sum + s.beats.length, 0);
    process.stdout.write(
      `✓ Valid outline JSON — ${result.data.sections.length} sections, ${beatCount} beats\n`,
    );
    return EXIT_OK;
  }
  printFieldErrorTable(result.errors);
  return EXIT_USER;
}
