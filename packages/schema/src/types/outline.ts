/**
 * Outline JSON — pure narrative model. Carries NO layout, theme, or style
 * information (HC-03 narrative purity). Authored as hand-written interfaces so
 * the public type surface stays stable and readable; the Zod schemas are typed
 * as z.ZodType<OutlineJson> to keep them in lockstep at compile time.
 */

export type NarrativeArc =
  | "problem-solution"
  | "chronological"
  | "thesis-support"
  | "story"
  | "comparison";

export type ApprovalStatusValue = "draft" | "frozen";

export interface OutlineMeta {
  title: string;
  audience: string;
  tone: string;
  narrative_arc: NarrativeArc;
  /** May be empty. */
  knowledge_base: string[];
}

export interface ApprovalStatus {
  status: ApprovalStatusValue;
  /** ISO-8601 timestamp or null. NOT date-validated structurally. */
  approved_at: string | null;
}

export interface OutlineBeat {
  id: string;
  point: string;
  support: string | null;
  /** Free text — a hint only. Never validated against the layout enum. */
  slide_hint: string | null;
  kb_backed: boolean;
}

export interface OutlineSection {
  id: string;
  title: string;
  accepted: boolean;
  beats: OutlineBeat[];
}

export interface OutlineJson {
  schema_version: "1";
  kind: "outline";
  id: string;
  meta: OutlineMeta;
  approval: ApprovalStatus;
  sections: OutlineSection[];
}
