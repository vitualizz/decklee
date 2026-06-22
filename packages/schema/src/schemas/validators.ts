import { z } from "zod";
import type { DeckJson } from "../types/deck.js";
import type { OutlineJson } from "../types/outline.js";
import { DeckSchema } from "./deck.schema.js";
import { OutlineSchema } from "./outline.schema.js";

/**
 * Field names banned UNCONDITIONALLY at every level of a parsed deck's content_props,
 * even on code slides. A key named any of these always fails — there is no exemption.
 */
export const BANNED_KEYS: ReadonlySet<string> = new Set([
  "style",
  "css",
  "class",
  "className",
  "token",
]);

/** Matches CSS-carrying string VALUES (colors, inline style, <style> blocks). */
export const STYLE_PAYLOAD_PATTERN: RegExp = /oklch\(|#[0-9a-f]{3,8}|rgb\(|<style|style=/i;

/**
 * Field names forbidden ANYWHERE in an Outline JSON document. Outline is pure
 * narrative (HC-03) — layout/theme/style concerns belong only in the Deck. These
 * must be detected on the RAW input (before Zod's strictObject strips them), so the
 * check lives here in the validator, not inside the schema's superRefine.
 */
export const OUTLINE_BANNED_KEYS: ReadonlySet<string> = new Set([
  "layout",
  "content_props",
  "theme",
  "theme_id",
  "style",
  "css",
  "class",
]);

export type FieldError = {
  /** Dotted/bracketed JSON path, e.g. "slides[2].content_props.heading". */
  path: string;
  /** Actionable, human-readable message (names the offending field/section/value). */
  message: string;
  /** ZodIssue.code, or "hc03_banned_key" / "hc03_style_value". */
  code: string;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldError[] };

/** Codes for the two HC-03 deep-scan failure modes. */
const HC03_BANNED_KEY = "hc03_banned_key";
const HC03_STYLE_VALUE = "hc03_style_value";

/**
 * Error thrown by assertNoStylePayload. Carries the dotted path and a discriminating
 * code so the safe* mappers can produce a precise FieldError without re-deriving it.
 */
export class StylePayloadError extends Error {
  readonly path: string;
  readonly code: string;

  constructor(path: string, message: string, code: string) {
    super(message);
    this.name = "StylePayloadError";
    this.path = path;
    this.code = code;
  }
}

function joinPath(segments: (string | number)[]): string {
  let out = "";
  for (const segment of segments) {
    if (typeof segment === "number") {
      out += `[${segment}]`;
    } else {
      out += out.length === 0 ? segment : `.${segment}`;
    }
  }
  return out;
}

/**
 * Deep-walk HC-03 guard. Throws on:
 *  - any object key in BANNED_KEYS (UNCONDITIONAL — even under layoutContext "code"); or
 *  - any string value matching STYLE_PAYLOAD_PATTERN, EXCEPT the value of the field
 *    literally keyed "code" when layoutContext === "code" (R-002 — value-only exemption).
 * Walks both objects and arrays.
 */
export function assertNoStylePayload(obj: unknown, layoutContext?: "code"): void {
  walk(obj, [], layoutContext);
}

function walk(
  node: unknown,
  path: (string | number)[],
  layoutContext: "code" | undefined,
): void {
  if (Array.isArray(node)) {
    node.forEach((element, index) => walk(element, [...path, index], layoutContext));
    return;
  }

  if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (BANNED_KEYS.has(key)) {
        // Unconditional — the key-name ban is never exempt, not even on code slides.
        throw new StylePayloadError(
          joinPath([...path, key]),
          `Field "${key}" is banned (HC-03) — styling must come from the theme, not the JSON payload.`,
          HC03_BANNED_KEY,
        );
      }
      walk(value, [...path, key], layoutContext);
    }
    return;
  }

  if (typeof node === "string") {
    const finalSegment = path[path.length - 1];
    // R-002 exemption: value-only, and ONLY the field literally keyed "code" on a code slide.
    const exempt = layoutContext === "code" && finalSegment === "code";
    if (!exempt && STYLE_PAYLOAD_PATTERN.test(node)) {
      const excerpt = node.length > 60 ? `${node.slice(0, 60)}…` : node;
      throw new StylePayloadError(
        joinPath(path),
        `Field "${joinPath(path)}" carries a CSS/style payload (HC-03): "${excerpt}". Styling must come from the theme.`,
        HC03_STYLE_VALUE,
      );
    }
  }
}

/**
 * Deep-walk over RAW outline input. Throws on the first key in OUTLINE_BANNED_KEYS,
 * carrying the actionable HC-03 narrative-purity message the LLM error panel surfaces.
 * Runs on raw input — before any strictObject parse strips unknown keys. Mirrors how
 * assertNoStylePayload guards the deck.
 */
export function assertNoOutlineBannedKeys(obj: unknown): void {
  walkOutlineKeys(obj, []);
}

function walkOutlineKeys(node: unknown, path: (string | number)[]): void {
  if (Array.isArray(node)) {
    node.forEach((element, index) => walkOutlineKeys(element, [...path, index]));
    return;
  }
  if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (OUTLINE_BANNED_KEYS.has(key)) {
        throw new StylePayloadError(
          joinPath([...path, key]),
          `Field "${key}" is not allowed in Outline JSON (narrative purity — HC-03).`,
          HC03_BANNED_KEY,
        );
      }
      walkOutlineKeys(value, [...path, key]);
    }
  }
}

/**
 * Throwing form — raw banned-key HC-03 scan, THEN structural parse + frozen-gate.
 * The banned-key scan runs first so its named HC-03 message wins over the generic
 * unrecognized_keys rejection strictObject would otherwise emit. For trusted callers.
 */
export function validateOutline(data: unknown): OutlineJson {
  assertNoOutlineBannedKeys(data);
  return OutlineSchema.parse(data);
}

/**
 * Throwing form — structural parse via DeckSchema THEN per-slide HC-03 deep-scan.
 * The deep-scan runs only after the structural parse succeeds.
 */
export function validateDeck(data: unknown): DeckJson {
  const deck = DeckSchema.parse(data);
  for (const slide of deck.slides) {
    assertNoStylePayload(
      slide.content_props,
      slide.layout === "code" ? "code" : undefined,
    );
  }
  return deck;
}

function zodIssuesToFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    path: joinPath(issue.path),
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Non-throwing form for the LLM-facing error panel. Runs the raw banned-key HC-03
 * scan first (so the panel gets the named narrative-purity message), then the
 * structural parse + frozen-gate. Never throws.
 */
export function safeValidateOutline(data: unknown): ValidationResult<OutlineJson> {
  try {
    assertNoOutlineBannedKeys(data);
  } catch (caught) {
    if (caught instanceof StylePayloadError) {
      return {
        ok: false,
        errors: [{ path: caught.path, message: caught.message, code: caught.code }],
      };
    }
    throw caught;
  }

  const parsed = OutlineSchema.safeParse(data);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  return { ok: false, errors: zodIssuesToFieldErrors(parsed.error) };
}

/**
 * Non-throwing form for the LLM-facing error panel. Funnels both ZodError.issues
 * AND assertNoStylePayload throws into a single FieldError[]. Never throws.
 */
export function safeValidateDeck(data: unknown): ValidationResult<DeckJson> {
  const parsed = DeckSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, errors: zodIssuesToFieldErrors(parsed.error) };
  }

  const deck = parsed.data;
  const errors: FieldError[] = [];
  deck.slides.forEach((slide, slideIndex) => {
    try {
      assertNoStylePayload(
        slide.content_props,
        slide.layout === "code" ? "code" : undefined,
      );
    } catch (caught) {
      if (caught instanceof StylePayloadError) {
        errors.push({
          path: joinPath(["slides", slideIndex, "content_props"]) + (caught.path ? `.${caught.path}` : ""),
          message: caught.message,
          code: caught.code,
        });
      } else {
        throw caught;
      }
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data: deck };
}
