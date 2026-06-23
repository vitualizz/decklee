/**
 * inline-images.ts — the image inliner for `decklee build`.
 *
 * Walks a raw parsed deck (unknown) and converts every LOCAL `*_image_src`
 * value on the three supported fields into a self-contained `data:` URI, so the
 * emitted HTML carries its images inline (HC-04). Runs BEFORE schema validation
 * and BEFORE emit (the inline → validate → emit invariant, ADR D1).
 *
 * Contract (ADR D2/D3/D4):
 *  - SYNCHRONOUS. Only I/O is readFileSync; no async, no network, no LLM (HC-02).
 *  - HARD errors THROW `InlinerError`; advisory WARNINGS are RETURNED in
 *    `InlineResult.warnings[]`. The two never mix.
 *  - External URLs (http/https/protocol-relative) are HARD-REJECTED — never
 *    fetched (OOS-05).
 *  - Already-inlined `data:` URIs pass through untouched → idempotent + bit-for-bit
 *    deterministic (NFR-4): values are mutated, JSON key order is preserved.
 *  - MIME map is LOCKED — no new extensions, no octet-stream fallback (D4).
 */
import { readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";

/** Returned to build.ts. `data` is the SAME parsed object, mutated in place (values only). */
export interface InlineResult {
  /** Raw parsed deck with local `*_image_src` values replaced by `data:` URIs. */
  data: unknown;
  /** Advisory-only diagnostics; the build still exits 0. */
  warnings: InlinerWarning[];
}

/** Advisory diagnostic — RETURNED, never thrown. */
export interface InlinerWarning {
  kind: "oversize" | "oversize-escalated" | "total-oversize";
  /** Field name, e.g. "image_src" | "left_image_src" | "right_image_src" | "<output.html>". */
  field: string;
  /** Owning slide id; "" for total-oversize. */
  slideId: string;
  /** Resolved local file path (or output HTML path for total-oversize). */
  path: string;
  /** Raw byte size measured. */
  bytes: number;
  /** Named, actionable, human-readable message (NFR-6). */
  message: string;
}

/**
 * Hard error — THROWN. build.ts maps `.code` → printErrorEnvelope + exit code.
 * `code` is a subset of the EXISTING build.ts ErrorCode union — no new members.
 */
export class InlinerError extends Error {
  constructor(
    public readonly code: "VALIDATION_ERROR" | "IO_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "InlinerError";
  }
}

/** Locked extension → MIME map (D4). Lookup by lowercased extname; miss → IO_ERROR. */
export const MIME_BY_EXT: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/** Per-image: ≥ this raw size → warning kind "oversize" (1.5 MB). */
export const PER_IMAGE_WARN_BYTES = 1_572_864;
/** Per-image: ≥ this raw size → warning kind "oversize-escalated" (2.25 MB). */
export const PER_IMAGE_ESCALATED_BYTES = 2_359_296;
/** Total HTML: ≥ this size → advisory warning (15 MB). */
export const TOTAL_HTML_ADVISORY_BYTES = 15_728_640;
/** Total HTML: ≥ this size → escalated warning (20 MB). */
export const TOTAL_HTML_ESCALATED_BYTES = 20_971_520;

/** A `(layout, prop)` pair the inliner walks. */
export interface FieldSpec {
  layout: "hero" | "two-up";
  prop: string;
}

/** EXACTLY the three schema image-source fields (D4). */
export const FIELD_SPECS: readonly FieldSpec[] = [
  { layout: "hero", prop: "image_src" }, // deck.schema.ts L11
  { layout: "two-up", prop: "left_image_src" }, // deck.schema.ts L41
  { layout: "two-up", prop: "right_image_src" }, // deck.schema.ts L43
];

/** Human-readable byte size, e.g. "2.3 MB". */
function human(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Inline every local `*_image_src` on the three supported fields into a `data:`
 * URI. Mutates `deck` in place (values only) and returns it alongside any
 * advisory warnings. See module header for the full contract.
 *
 * @param deck         raw JSON.parse result (may be malformed — never assumed)
 * @param deckFilePath path passed to `decklee build`; its dirname is the image root
 */
export function inlineImages(deck: unknown, deckFilePath: string): InlineResult {
  const warnings: InlinerWarning[] = [];
  const baseDir = dirname(deckFilePath);

  if (!isObject(deck) || !Array.isArray(deck.slides)) {
    return { data: deck, warnings }; // no-op for malformed / shapeless input
  }

  for (const slide of deck.slides) {
    if (!isObject(slide)) continue;
    const id = typeof slide.id === "string" ? slide.id : "(unknown)";
    const cp = slide.content_props;
    if (!isObject(cp)) continue;

    for (const spec of FIELD_SPECS) {
      if (slide.layout !== spec.layout) continue;
      const value = cp[spec.prop];
      if (typeof value !== "string" || value === "") continue; // absent/empty → no-op

      // STEP 1 — external URL → HARD REJECT (OOS-05, never fetch)
      if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("//")) {
        throw new InlinerError(
          "VALIDATION_ERROR",
          `External image URL not allowed: "${value}" in field ${spec.prop} on slide "${id}". ` +
            `Use a local file path; decklee does not fetch remote images.`,
        );
      }

      // STEP 2 — already a data: URI → SKIP (idempotent passthrough)
      if (value.startsWith("data:")) continue;

      // STEP 3 — local path: ext check → read → size-check → base64
      const ext = extname(value).toLowerCase();
      const mime = MIME_BY_EXT[ext];
      if (mime === undefined) {
        throw new InlinerError(
          "IO_ERROR",
          `Unsupported image extension "${ext}" for file "${value}" in field ${spec.prop} ` +
            `on slide "${id}". Supported: .png .jpg .jpeg .webp .gif .svg.`,
        );
      }

      const abs = resolve(baseDir, value);
      let bytes: Buffer;
      try {
        bytes = readFileSync(abs);
      } catch {
        throw new InlinerError(
          "IO_ERROR",
          `Image not found: "${abs}" (from field ${spec.prop} on slide "${id}").`,
        );
      }

      const n = bytes.length;
      if (n >= PER_IMAGE_ESCALATED_BYTES) {
        warnings.push({
          kind: "oversize-escalated",
          field: spec.prop,
          slideId: id,
          path: abs,
          bytes: n,
          message:
            `Image ${abs} is ${human(n)} (> 2.25MB) on slide "${id}" — ` +
            `strongly consider resizing; it will bloat the self-contained HTML.`,
        });
      } else if (n >= PER_IMAGE_WARN_BYTES) {
        warnings.push({
          kind: "oversize",
          field: spec.prop,
          slideId: id,
          path: abs,
          bytes: n,
          message: `Image ${abs} is ${human(n)} (> 1.5MB) on slide "${id}" — consider resizing.`,
        });
      }

      cp[spec.prop] = `data:${mime};base64,${bytes.toString("base64")}`; // mutate value only
    }
  }

  return { data: deck, warnings };
}
