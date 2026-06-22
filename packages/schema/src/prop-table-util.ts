/**
 * prop-table-util.ts — schema-derived prop-table introspection.
 *
 * Moved verbatim out of @decklee/cli's agents-md.ts so the prop-table logic has
 * a single home next to the Zod schemas it introspects. Consumed by the CLI
 * AGENTS.md + cheatsheet generators AND the design-book prop-table generator.
 * Behaviour is identical to the prior in-CLI implementation — the CLI
 * drift-check pins generateAgentsMd() to byte-identical output.
 */
import { LAYOUT_IDS } from "./constants.js";
import {
  HeroPropsSchema,
  TwoUpPropsSchema,
  CodePropsSchema,
  QuotePropsSchema,
} from "./schemas/index.js";

/** A Zod-introspectable schema: either a ZodObject (has `.shape`) or a ZodEffects wrapping one. */
export type IntrospectableSchema = {
  _def: { typeName: string; schema?: IntrospectableSchema; innerType?: IntrospectableSchema; values?: readonly string[]; type?: IntrospectableSchema };
  shape?: Record<string, IntrospectableSchema>;
};

export type PropRow = {
  name: string;
  type: string;
  required: boolean;
};

/** Ordered prop rows per layout id — shared by the cheatsheet generator. */
export function buildPropTablesByLayout(): Record<string, PropRow[]> {
  const out: Record<string, PropRow[]> = {};
  for (const id of LAYOUT_IDS) {
    out[id] = buildPropTable(PROP_SCHEMAS[id]);
  }
  return out;
}

/**
 * Unwrap a ZodEffects (`.superRefine(...)`) to its inner ZodObject so `.shape`
 * is readable. Hero & TwoUp are ZodEffects; Code & Quote are plain ZodObject.
 * (R2 — calling `.shape` on a ZodEffects returns undefined and crashes.)
 */
export function unwrapObject(schema: IntrospectableSchema): IntrospectableSchema {
  if (schema._def.typeName === "ZodEffects" && schema._def.schema) {
    return schema._def.schema;
  }
  return schema;
}

/** A field is optional iff its outermost wrapper is ZodOptional. */
export function isOptional(field: IntrospectableSchema): boolean {
  return field._def.typeName === "ZodOptional";
}

/**
 * Render a field's value type as a contract string. Unwraps ZodOptional first,
 * then maps the inner Zod typeName. Enums list their literal values; arrays
 * recurse into their element type.
 */
export function zodTypeToString(field: IntrospectableSchema): string {
  const inner = isOptional(field) && field._def.innerType ? field._def.innerType : field;
  switch (inner._def.typeName) {
    case "ZodString":
      return "string";
    case "ZodBoolean":
      return "boolean";
    case "ZodNumber":
      return "number";
    case "ZodEnum":
      return (inner._def.values ?? []).join("|");
    case "ZodArray":
      return inner._def.type ? `${zodTypeToString(inner._def.type)}[]` : "array";
    default:
      return inner._def.typeName.replace(/^Zod/, "").toLowerCase();
  }
}

/** Derive the ordered prop rows for one primitive schema. */
export function buildPropTable(schema: IntrospectableSchema): PropRow[] {
  const obj = unwrapObject(schema);
  const shape = obj.shape ?? {};
  return Object.entries(shape).map(([name, field]) => ({
    name,
    type: zodTypeToString(field),
    required: !isOptional(field),
  }));
}

export const PROP_SCHEMAS: Record<string, IntrospectableSchema> = {
  hero: HeroPropsSchema as unknown as IntrospectableSchema,
  "two-up": TwoUpPropsSchema as unknown as IntrospectableSchema,
  code: CodePropsSchema as unknown as IntrospectableSchema,
  quote: QuotePropsSchema as unknown as IntrospectableSchema,
};
