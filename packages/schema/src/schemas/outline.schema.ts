import { z } from "zod";
import { SCHEMA_VERSION } from "../constants.js";
import type { OutlineJson } from "../types/outline.js";

// Note: banned-key (HC-03 narrative purity) detection lives in the validator
// (assertNoOutlineBannedKeys in validators.ts), NOT here. z.strictObject strips
// unknown keys BEFORE superRefine runs, so a key-name check inside superRefine is
// dead code — the named HC-03 message must be produced from the RAW input.

export const NarrativeArcSchema = z.enum([
  "problem-solution",
  "chronological",
  "thesis-support",
  "story",
  "comparison",
]);

export const OutlineMetaSchema = z.strictObject({
  title: z.string(),
  audience: z.string(),
  tone: z.string(),
  narrative_arc: NarrativeArcSchema,
  knowledge_base: z.array(z.string()),
});

// approved_at: plain .nullable() (not .datetime()) — avoids rejecting legacy or
// non-strict ISO values; date-shape validation is deferred to a consumer that needs it.
export const ApprovalStatusSchema = z.strictObject({
  status: z.enum(["draft", "frozen"]),
  approved_at: z.string().nullable(),
});

export const OutlineBeatSchema = z.strictObject({
  id: z.string(),
  point: z.string(),
  support: z.string().nullable(),
  // Free text — intentionally never validated against the layout enum.
  slide_hint: z.string().nullable(),
  kb_backed: z.boolean(),
});

export const OutlineSectionSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  accepted: z.boolean(),
  beats: z.array(OutlineBeatSchema),
});

const OutlineObjectSchema = z.strictObject({
  schema_version: z.literal(SCHEMA_VERSION),
  kind: z.literal("outline"),
  id: z.string(),
  meta: OutlineMetaSchema,
  approval: ApprovalStatusSchema,
  sections: z.array(OutlineSectionSchema),
});

export const OutlineSchema: z.ZodType<OutlineJson> = OutlineObjectSchema.superRefine(
  (outline, ctx) => {
    // INVARIANT-1 — frozen-gate: a frozen outline requires every section accepted.
    // (INVARIANT-2 banned-key rejection is enforced in the validator on raw input.)
    if (outline.approval.status === "frozen") {
      outline.sections.forEach((section, sectionIndex) => {
        if (section.accepted !== true) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["sections", sectionIndex, "accepted"],
            message: `approval.status is 'frozen' but section '${section.id}' has accepted: false — all sections must be accepted before freezing.`,
          });
        }
      });
    }
  },
);
