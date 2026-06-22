/**
 * generate-prop-tables.test.ts — Schema-faithful prop-table generator tests.
 *
 * Validates that buildPropTableData() is deterministic, covers all 4 layouts,
 * and faithfully mirrors the @decklee/schema Zod shapes: required/optional flags
 * must align with what the schema actually enforces. Tests are schema-driven —
 * they assert named props, not array indices, so they won't drift if the schema
 * gains new optional props.
 *
 * Importing buildPropTableData() has no side effects (the emit() path is
 * guarded by import.meta.url === file://${process.argv[1]}).
 */
import { describe, it, expect } from "vitest";
import { buildPropTableData } from "./generate-prop-tables.js";
import { buildPropTablesByLayout } from "@decklee/schema";
import type { PropTableData } from "./generate-prop-tables.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTable(data: PropTableData[], primitive: string): PropTableData {
  const t = data.find((d) => d.primitive === primitive);
  if (!t) throw new Error(`No prop table for primitive "${primitive}"`);
  return t;
}

function getProp(table: PropTableData, prop: string) {
  const r = table.rows.find((row) => row.prop === prop);
  if (!r) throw new Error(`Prop "${prop}" not found in table "${table.primitive}"`);
  return r;
}

// ── Determinism ───────────────────────────────────────────────────────────────

describe("buildPropTableData — determinism", () => {
  it("two independent calls return identical JSON", () => {
    const first = JSON.stringify(buildPropTableData());
    const second = JSON.stringify(buildPropTableData());
    expect(first).toBe(second);
  });
});

// ── Coverage: 4 layouts ───────────────────────────────────────────────────────

describe("buildPropTableData — layout coverage", () => {
  it("returns exactly 4 entries", () => {
    expect(buildPropTableData()).toHaveLength(4);
  });

  it("covers hero, two-up, code, quote in order", () => {
    const primitives = buildPropTableData().map((d) => d.primitive);
    expect(primitives).toEqual(["hero", "two-up", "code", "quote"]);
  });

  it("each entry has a non-empty rows array", () => {
    for (const table of buildPropTableData()) {
      expect(table.rows.length, `${table.primitive} rows`).toBeGreaterThan(0);
    }
  });
});

// ── Schema faithfulness: Hero ─────────────────────────────────────────────────

describe("Hero prop table matches HeroPropsSchema", () => {
  const data = buildPropTableData();
  const hero = getTable(data, "hero");

  it("headline → required:true (only required hero prop)", () => {
    const row = getProp(hero, "headline");
    expect(row.required).toBe(true);
    expect(row.type).toBe("string");
  });

  it("eyebrow → required:false", () => {
    expect(getProp(hero, "eyebrow").required).toBe(false);
  });

  it("subheadline → required:false", () => {
    expect(getProp(hero, "subheadline").required).toBe(false);
  });

  it("cta_label → required:false", () => {
    expect(getProp(hero, "cta_label").required).toBe(false);
  });

  it("background_treatment → required:false, type is enum string", () => {
    const row = getProp(hero, "background_treatment");
    expect(row.required).toBe(false);
    // Zod enum rendered as pipe-joined values
    expect(row.type).toMatch(/color/);
    expect(row.type).toMatch(/image/);
    expect(row.type).toMatch(/gradient/);
  });

  it("image_src → required:false (conditionally required via superRefine, not structurally)", () => {
    expect(getProp(hero, "image_src").required).toBe(false);
  });

  it("image_alt → required:false (conditionally required via superRefine)", () => {
    expect(getProp(hero, "image_alt").required).toBe(false);
  });
});

// ── Schema faithfulness: TwoUp ────────────────────────────────────────────────

describe("TwoUp prop table matches TwoUpPropsSchema", () => {
  const data = buildPropTableData();
  const twoUp = getTable(data, "two-up");

  it("left_body → required:true", () => {
    const row = getProp(twoUp, "left_body");
    expect(row.required).toBe(true);
    expect(row.type).toBe("string");
  });

  it("right_body → required:true", () => {
    expect(getProp(twoUp, "right_body").required).toBe(true);
  });

  it("left_heading → required:false", () => {
    expect(getProp(twoUp, "left_heading").required).toBe(false);
  });

  it("right_heading → required:false", () => {
    expect(getProp(twoUp, "right_heading").required).toBe(false);
  });

  it("left_type → required:false, enum type", () => {
    const row = getProp(twoUp, "left_type");
    expect(row.required).toBe(false);
    expect(row.type).toMatch(/text/);
    expect(row.type).toMatch(/image/);
    expect(row.type).toMatch(/stat/);
  });

  it("divider → required:false, boolean type", () => {
    const row = getProp(twoUp, "divider");
    expect(row.required).toBe(false);
    expect(row.type).toBe("boolean");
  });

  it("left_image_src and left_image_alt → both required:false (superRefine conditional)", () => {
    expect(getProp(twoUp, "left_image_src").required).toBe(false);
    expect(getProp(twoUp, "left_image_alt").required).toBe(false);
  });
});

// ── Schema faithfulness: Code ─────────────────────────────────────────────────

describe("Code prop table matches CodePropsSchema", () => {
  const data = buildPropTableData();
  const code = getTable(data, "code");

  it("code → required:true", () => {
    const row = getProp(code, "code");
    expect(row.required).toBe(true);
    expect(row.type).toBe("string");
  });

  it("language → required:true", () => {
    const row = getProp(code, "language");
    expect(row.required).toBe(true);
    expect(row.type).toBe("string");
  });

  it("heading → required:false", () => {
    expect(getProp(code, "heading").required).toBe(false);
  });

  it("highlight_lines → required:false, array type", () => {
    const row = getProp(code, "highlight_lines");
    expect(row.required).toBe(false);
    expect(row.type).toMatch(/\[\]/); // number[]
  });

  it("caption → required:false", () => {
    expect(getProp(code, "caption").required).toBe(false);
  });
});

// ── Schema faithfulness: Quote ────────────────────────────────────────────────

describe("Quote prop table matches QuotePropsSchema", () => {
  const data = buildPropTableData();
  const quote = getTable(data, "quote");

  it("quote → required:true", () => {
    const row = getProp(quote, "quote");
    expect(row.required).toBe(true);
    expect(row.type).toBe("string");
  });

  it("attribution → required:false", () => {
    expect(getProp(quote, "attribution").required).toBe(false);
  });

  it("context → required:false", () => {
    expect(getProp(quote, "context").required).toBe(false);
  });

  it("emphasis → required:false, enum type", () => {
    const row = getProp(quote, "emphasis");
    expect(row.required).toBe(false);
    expect(row.type).toMatch(/full/);
    expect(row.type).toMatch(/centered/);
    expect(row.type).toMatch(/ruled/);
  });
});

// ── PROP_NOTES annotation coverage ───────────────────────────────────────────

describe("PROP_NOTES — annotated props carry non-empty notes", () => {
  const data = buildPropTableData();

  const annotatedProps: { primitive: string; prop: string }[] = [
    { primitive: "hero", prop: "headline" },
    { primitive: "hero", prop: "background_treatment" },
    { primitive: "hero", prop: "image_src" },
    { primitive: "hero", prop: "image_alt" },
    { primitive: "two-up", prop: "left_body" },
    { primitive: "two-up", prop: "left_type" },
    { primitive: "code", prop: "code" },
    { primitive: "code", prop: "language" },
    { primitive: "quote", prop: "quote" },
    { primitive: "quote", prop: "emphasis" },
  ];

  for (const { primitive, prop } of annotatedProps) {
    it(`${primitive}.${prop} has a non-empty notes string`, () => {
      const table = getTable(data, primitive);
      const row = getProp(table, prop);
      expect(row.notes.length, `${primitive}.${prop} notes`).toBeGreaterThan(0);
    });
  }
});

// ── Cross-check: buildPropTablesByLayout matches buildPropTableData ────────────

describe("buildPropTablesByLayout (schema) vs buildPropTableData (generator) — alignment", () => {
  it("required flags are identical between the two introspections", () => {
    const byLayout = buildPropTablesByLayout();
    const tableData = buildPropTableData();

    for (const table of tableData) {
      const schemaRows = byLayout[table.primitive] ?? [];
      for (const row of table.rows) {
        const schemaRow = schemaRows.find((r) => r.name === row.prop);
        expect(schemaRow, `schema has prop "${row.prop}" for "${table.primitive}"`).toBeDefined();
        expect(row.required, `${table.primitive}.${row.prop} required flag`).toBe(
          schemaRow!.required
        );
      }
    }
  });

  it("ZodEffects wrappers (hero + two-up) unwrap without throwing — row arrays non-empty", () => {
    const byLayout = buildPropTablesByLayout();
    expect(byLayout["hero"].length).toBeGreaterThan(0);
    expect(byLayout["two-up"].length).toBeGreaterThan(0);
  });
});
