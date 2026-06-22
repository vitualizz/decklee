import { describe, it, expect } from "vitest";
import { OutlineSchema } from "./outline.schema.js";
import { safeValidateOutline } from "./validators.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function minimalOutline() {
  return {
    schema_version: "1",
    kind: "outline",
    id: "outline-001",
    meta: {
      title: "Test Outline",
      audience: "Developers",
      tone: "Technical",
      narrative_arc: "problem-solution",
      knowledge_base: [],
    },
    approval: {
      status: "draft",
      approved_at: null,
    },
    sections: [],
  };
}

function fullOutline() {
  return {
    schema_version: "1",
    kind: "outline",
    id: "outline-full-001",
    meta: {
      title: "Full Outline",
      audience: "Engineers",
      tone: "Conversational",
      narrative_arc: "story",
      knowledge_base: ["kb-001", "kb-002"],
    },
    approval: {
      status: "draft",
      approved_at: "2026-06-20T10:00:00Z",
    },
    sections: [
      {
        id: "sec-1",
        title: "Introduction",
        accepted: true,
        beats: [
          {
            id: "beat-1",
            point: "Set the scene",
            support: "Industry data supports this",
            slide_hint: "hero",
            kb_backed: true,
          },
        ],
      },
    ],
  };
}

function frozenOutlineAllAccepted() {
  return {
    ...minimalOutline(),
    approval: { status: "frozen", approved_at: "2026-06-20T12:00:00Z" },
    sections: [
      {
        id: "sec-1",
        title: "Intro",
        accepted: true,
        beats: [],
      },
      {
        id: "sec-2",
        title: "Body",
        accepted: true,
        beats: [],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------

describe("OutlineSchema — happy path", () => {
  it("accepts a minimal valid outline", () => {
    const result = OutlineSchema.safeParse(minimalOutline());
    expect(result.success).toBe(true);
  });

  it("accepts a full outline with all optionals populated", () => {
    const result = OutlineSchema.safeParse(fullOutline());
    expect(result.success).toBe(true);
  });

  it("accepts slide_hint as arbitrary free text (not validated against layout enum)", () => {
    const outline = minimalOutline();
    outline.sections = [
      {
        id: "sec-1",
        title: "Section",
        accepted: false,
        beats: [
          {
            id: "beat-1",
            point: "A point",
            support: null,
            // Free text — should never fail even if it looks like a layout name
            slide_hint: "some-custom-layout-hint-that-is-totally-made-up",
            kb_backed: false,
          },
        ],
      },
    ];
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(true);
  });

  it("accepts draft status with accepted:false sections", () => {
    const outline = minimalOutline();
    outline.sections = [
      { id: "sec-1", title: "Section", accepted: false, beats: [] },
    ];
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(true);
  });

  it("accepts all valid narrative_arc values", () => {
    const arcs = [
      "problem-solution",
      "chronological",
      "thesis-support",
      "story",
      "comparison",
    ] as const;

    for (const arc of arcs) {
      const outline = minimalOutline();
      (outline.meta as Record<string, unknown>).narrative_arc = arc;
      const result = OutlineSchema.safeParse(outline);
      expect(result.success, `Expected narrative_arc "${arc}" to pass`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Frozen-Gate (INVARIANT-1)
// ---------------------------------------------------------------------------

describe("OutlineSchema — frozen-gate (INVARIANT-1)", () => {
  it("passes when status=frozen and all sections have accepted:true", () => {
    const result = OutlineSchema.safeParse(frozenOutlineAllAccepted());
    expect(result.success).toBe(true);
  });

  it("fails when status=frozen and one section has accepted:false, naming the section id", () => {
    const outline = frozenOutlineAllAccepted();
    outline.sections[1].accepted = false;
    const offendingSectionId = outline.sections[1].id;

    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(false);

    if (!result.success) {
      const issues = result.error.issues;
      const frozenIssue = issues.find((i) =>
        i.message.includes(offendingSectionId),
      );
      expect(frozenIssue, "Expected an issue naming the offending section id").toBeDefined();
      expect(frozenIssue!.path).toContain("accepted");
    }
  });

  it("names every offending section id when multiple sections are rejected", () => {
    const outline = frozenOutlineAllAccepted();
    outline.sections[0].accepted = false;
    outline.sections[1].accepted = false;

    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(false);

    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(" ");
      expect(messages).toContain(outline.sections[0].id);
      expect(messages).toContain(outline.sections[1].id);
    }
  });

  it("allows draft status even with accepted:false sections everywhere", () => {
    const outline = minimalOutline();
    outline.sections = [
      { id: "sec-1", title: "A", accepted: false, beats: [] },
      { id: "sec-2", title: "B", accepted: false, beats: [] },
    ];
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// strictObject unknown-key rejection
// ---------------------------------------------------------------------------

describe("OutlineSchema — strictObject rejects unknown extra keys", () => {
  it("rejects an unknown key at root level (not in banned list)", () => {
    const outline = { ...minimalOutline(), totally_unknown_field: "surprise" };
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(false);
  });

  it("rejects an unknown key inside meta", () => {
    const outline = minimalOutline();
    (outline.meta as Record<string, unknown>).unknown_meta_key = "value";
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(false);
  });

  it("rejects an unknown key inside a section", () => {
    const outline = minimalOutline();
    outline.sections = [
      {
        id: "sec-1",
        title: "Section",
        accepted: false,
        beats: [],
        // @ts-expect-error intentionally adding unknown key
        unknown_section_key: "nope",
      },
    ];
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(false);
  });

  it("rejects an unknown key inside a beat", () => {
    const outline = minimalOutline();
    outline.sections = [
      {
        id: "sec-1",
        title: "Section",
        accepted: true,
        beats: [
          {
            id: "beat-1",
            point: "A point",
            support: null,
            slide_hint: null,
            kb_backed: true,
            // @ts-expect-error intentionally adding unknown key
            unknown_beat_key: "nope",
          },
        ],
      },
    ];
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Named banned-key rejection (INVARIANT-2) — each key must produce a NAMED issue
// ---------------------------------------------------------------------------

describe("OutlineSchema — named banned-key rejection (INVARIANT-2)", () => {
  const BANNED = [
    "layout",
    "content_props",
    "theme",
    "theme_id",
    "style",
    "css",
    "class",
  ] as const;

  /**
   * Helper: asserts that safeValidateOutline rejects the given data AND surfaces the
   * NAMED HC-03 narrative-purity error for the banned key. Banned-key detection runs in
   * the validator over the RAW input (assertNoOutlineBannedKeys) — NOT in the schema's
   * superRefine, where z.strictObject would strip the key before it could be seen.
   */
  function expectNamedBannedKeyIssue(data: unknown, key: string) {
    const result = safeValidateOutline(data);
    expect(result.ok, `Expected validation to fail for banned key "${key}"`).toBe(false);

    if (!result.ok) {
      const hc03Error = result.errors.find(
        (e) => e.code === "hc03_banned_key" && e.message.includes(`"${key}"`),
      );
      expect(
        hc03Error,
        `Expected a named hc03_banned_key error for "${key}", got: ${JSON.stringify(result.errors, null, 2)}`,
      ).toBeDefined();
      expect(hc03Error!.message).toContain("HC-03");
    }
  }

  describe("banned key at root level", () => {
    for (const key of BANNED) {
      it(`rejects key "${key}" at root with named issue`, () => {
        const outline = { ...minimalOutline(), [key]: "injected" };
        expectNamedBannedKeyIssue(outline, key);
      });
    }
  });

  describe("banned key inside meta", () => {
    for (const key of BANNED) {
      it(`rejects key "${key}" inside meta with named issue`, () => {
        const outline = minimalOutline();
        (outline.meta as Record<string, unknown>)[key] = "injected";
        expectNamedBannedKeyIssue(outline, key);
      });
    }
  });

  describe("banned key inside approval", () => {
    for (const key of BANNED) {
      it(`rejects key "${key}" inside approval with named issue`, () => {
        const outline = minimalOutline();
        (outline.approval as Record<string, unknown>)[key] = "injected";
        expectNamedBannedKeyIssue(outline, key);
      });
    }
  });

  describe("banned key inside a section", () => {
    for (const key of BANNED) {
      it(`rejects key "${key}" inside a section with named issue`, () => {
        const outline = minimalOutline();
        outline.sections = [
          {
            id: "sec-1",
            title: "Section",
            accepted: false,
            beats: [],
            [key]: "injected",
          } as unknown as (typeof outline.sections)[0],
        ];
        expectNamedBannedKeyIssue(outline, key);
      });
    }
  });

  describe("banned key inside a beat", () => {
    for (const key of BANNED) {
      it(`rejects key "${key}" inside a beat with named issue`, () => {
        const outline = minimalOutline();
        outline.sections = [
          {
            id: "sec-1",
            title: "Section",
            accepted: true,
            beats: [
              {
                id: "beat-1",
                point: "A point",
                support: null,
                slide_hint: null,
                kb_backed: true,
                [key]: "injected",
              } as unknown as (typeof outline.sections)[0]["beats"][0],
            ],
          },
        ];
        expectNamedBannedKeyIssue(outline, key);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// narrative_arc enum validation
// ---------------------------------------------------------------------------

describe("OutlineSchema — narrative_arc enum", () => {
  it("rejects an unknown narrative_arc value", () => {
    const outline = minimalOutline();
    (outline.meta as Record<string, unknown>).narrative_arc = "hero-journey";
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Beats structure
// ---------------------------------------------------------------------------

describe("OutlineSchema — beats structure", () => {
  it("accepts null support and null slide_hint", () => {
    const outline = minimalOutline();
    outline.sections = [
      {
        id: "sec-1",
        title: "Section",
        accepted: true,
        beats: [
          {
            id: "beat-1",
            point: "A point",
            support: null,
            slide_hint: null,
            kb_backed: false,
          },
        ],
      },
    ];
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(true);
  });

  it("accepts multiple beats in a section", () => {
    const outline = minimalOutline();
    outline.sections = [
      {
        id: "sec-1",
        title: "Section",
        accepted: true,
        beats: [
          { id: "beat-1", point: "Point 1", support: "Evidence", slide_hint: "code", kb_backed: true },
          { id: "beat-2", point: "Point 2", support: null, slide_hint: null, kb_backed: false },
        ],
      },
    ];
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(true);
  });

  it("accepts empty beats array", () => {
    const outline = minimalOutline();
    outline.sections = [
      { id: "sec-1", title: "Section", accepted: true, beats: [] },
    ];
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(true);
  });

  it("requires kb_backed as boolean", () => {
    const outline = minimalOutline();
    outline.sections = [
      {
        id: "sec-1",
        title: "Section",
        accepted: true,
        beats: [
          {
            id: "beat-1",
            point: "A point",
            support: null,
            slide_hint: null,
            // @ts-expect-error intentionally wrong type
            kb_backed: "yes",
          },
        ],
      },
    ];
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// schema_version + kind literals
// ---------------------------------------------------------------------------

describe("OutlineSchema — root literals", () => {
  it("rejects wrong schema_version", () => {
    const outline = { ...minimalOutline(), schema_version: "2" };
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(false);
  });

  it("rejects wrong kind", () => {
    const outline = { ...minimalOutline(), kind: "deck" };
    const result = OutlineSchema.safeParse(outline);
    expect(result.success).toBe(false);
  });
});
