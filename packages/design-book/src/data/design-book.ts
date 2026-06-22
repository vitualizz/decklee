/**
 * design-book.ts — the authored content of the DeckLee Design Book.
 *
 * Each story is one Reveal slide: a live render of a real design-system
 * primitive (or a section-opener hero shell) plus its book-chrome routing.
 * Foundation-first ordering: cover → tokens → primitives → themes → the rule →
 * print → end card (~27 stories).
 *
 * CONTRACT: every primitive story carries `theme_id: 'dev'` (the host handshake
 * prop). Schema validation runs on content_props WITH theme_id stripped — see
 * design-book-data.test.ts. Image stories satisfy the schema superRefine
 * (image_src + image_alt together).
 */

export type PrimitiveId = "hero" | "two-up" | "code" | "quote";
export type LayoutId = "hero" | "two-up" | "code" | "quote";

export type BookChrome = {
  prop_table?: PrimitiveId;
  token_table?: "color" | "typography" | "spacing";
  /** Specialized canvas/chrome visualization keyed by name (rendered by index.astro). */
  visual?: "color-swatches" | "type-specimen" | "spacing-viz" | "theme-checklist" | "theme-steps";
  annotation?: string;
};

export interface DesignBookStory {
  /** Stable slug → Reveal data-id (durable URL hash). */
  id: string;
  /** Human section label, e.g. "2.1 Hero". */
  section: string;
  /** Section grouping id used by the rail, e.g. "primitives". */
  sectionId: string;
  /** The live primitive, or null for a section-opener shell. */
  primitive: PrimitiveId | null;
  /** Human variant label, e.g. "Minimal". */
  variant_label: string;
  /** Reveal layout id (always one of LAYOUT_IDS). */
  layout: LayoutId;
  /** content_props for the primitive, INCLUDING theme_id:'dev'. */
  props: Record<string, unknown>;
  /** What this story demonstrates (book-chrome annotation). */
  notes: string;
  /** Optional book-chrome routing for this slide. */
  book_chrome: BookChrome;
}

export interface SectionNavItem {
  id: string;
  label: string;
  firstSlideIndex: number;
}

/** Anchor-nav item for the landing page rail (navMode='anchor'). */
export interface LandingNavItem {
  id: string;
  label: string;
  anchor: string;
}

const DEV = { theme_id: "dev" };

export const STORIES: DesignBookStory[] = [
  // ── SECTION 0 — COVER ────────────────────────────────────────────────
  {
    id: "cover",
    section: "00 Cover",
    sectionId: "cover",
    primitive: "hero",
    variant_label: "Cover",
    layout: "hero",
    props: {
      ...DEV,
      eyebrow: "DeckLee Design System",
      headline: "Ship the contract, not the chaos.",
      subheadline: "A locked set of layouts, a three-layer token system, and one rule that keeps the layout brain honest. This book is itself a DeckLee deck.",
      cta_label: "→ Foundations",
    },
    notes: "The book opens as a real deck — proving the viewer works while it sets the editorial voice.",
    book_chrome: {},
  },

  // ── SECTION 1 — FOUNDATIONS ──────────────────────────────────────────
  {
    id: "foundations-opener",
    section: "01 Foundations",
    sectionId: "foundations",
    primitive: null,
    variant_label: "Section opener",
    layout: "hero",
    props: {
      ...DEV,
      eyebrow: "01 / Foundations",
      headline: "Tokens",
      subheadline: "The raw material. Every primitive consumes these — and only these.",
    },
    notes: "Foundation-first: read the raw material before the components that spend it.",
    book_chrome: {},
  },
  {
    id: "foundations-color",
    section: "1.2 Color tokens",
    sectionId: "foundations",
    primitive: "two-up",
    variant_label: "Color tokens",
    layout: "two-up",
    props: {
      ...DEV,
      left_heading: "Semantic color",
      left_body: "Twelve --dk-color-* roles. Backgrounds, foregrounds, two accents, plus alpha-only border and overlay. Syntax colors are aliases — change an accent, the code reskins with it.",
      right_heading: "Dev theme",
      right_body: "The dev theme binds every role to an rgb()-before-oklch() cascade. Older engines keep sRGB; capable engines win with oklch. The swatch grid and reference table read live from dev.css.",
      divider: true,
    },
    notes: "Swatch grid + token reference are book-chrome read straight from tokens/color.css and themes/dev/dev.css.",
    book_chrome: { visual: "color-swatches", token_table: "color", annotation: "WCAG contrast computed at build against bg-base rgb(11,12,17)." },
  },
  {
    id: "foundations-typography",
    section: "1.3 Typography tokens",
    sectionId: "foundations",
    primitive: "hero",
    variant_label: "Typography tokens",
    layout: "hero",
    props: {
      ...DEV,
      eyebrow: "Space Grotesk · Instrument Sans · JetBrains Mono",
      headline: "Type that scales, never reflows.",
      subheadline: "Six fixed-px steps at the 1920 frame — 108 / 76 / 58 / 28 / 24 / 21. The SlideStage scales the whole canvas as a unit.",
    },
    notes: "The hero demonstrates the scale contrast live; the full specimen + reference table are book-chrome.",
    book_chrome: { visual: "type-specimen", token_table: "typography" },
  },
  {
    id: "foundations-spacing",
    section: "1.4 Spacing tokens",
    sectionId: "foundations",
    primitive: "two-up",
    variant_label: "Spacing tokens",
    layout: "two-up",
    props: {
      ...DEV,
      left_heading: "4px base scale",
      left_body: "--dk-space-1 through --dk-space-12, a linear 4px step. Composed, never hand-tuned — book-chrome sizing reuses these instead of minting new tokens.",
      right_heading: "Slide padding",
      right_body: "Two semantic pads frame every slide: --dk-space-slide-pad-x (96px) and --dk-space-slide-pad-y (72px). Fixed px, no vw/vh — the canvas scales, the padding holds.",
      divider: true,
    },
    notes: "Horizontal bar viz + pad diagram are book-chrome; values read from spacing.css.",
    book_chrome: { visual: "spacing-viz", token_table: "spacing" },
  },

  // ── SECTION 2 — PRIMITIVES ───────────────────────────────────────────
  {
    id: "primitives-opener",
    section: "02 Primitives",
    sectionId: "primitives",
    primitive: null,
    variant_label: "Section opener",
    layout: "hero",
    props: {
      ...DEV,
      eyebrow: "02 / Primitives",
      headline: "Four locked layouts",
      subheadline: "Hero · Two-Up · Code · Quote — the complete set. No fifth layout, no escape hatch.",
    },
    notes: "Statement → analysis → technical → testimony: the deck narrative arc.",
    book_chrome: {},
  },

  // The four primitive-variant stories that lived here (hero/two-up/code/quote
  // × minimal/full/image…) migrated OUT of the editorial corpus into co-located
  // playground fixtures: src/data/fixtures/*.demo.ts. The primitives-opener
  // above stays as the rail anchor; index.astro + demo.astro glob the fixtures
  // and merge the derived slides back in at this position.

  // ── SECTION 3 — THEMES ───────────────────────────────────────────────
  {
    id: "themes-opener",
    section: "03 Themes",
    sectionId: "themes",
    primitive: null,
    variant_label: "Section opener",
    layout: "hero",
    props: {
      ...DEV,
      eyebrow: "03 / Themes",
      headline: "Swap the theme. Keep the deck.",
      subheadline: "One theme_id at deck.meta — the entire visual identity rebinds, zero component changes.",
    },
    notes: "The OSS flywheel argument: themes are data, not forks.",
    book_chrome: {},
  },
  {
    id: "themes-dev-anatomy",
    section: "3.1 Dev theme anatomy",
    sectionId: "themes",
    primitive: "two-up",
    variant_label: "Dev theme anatomy",
    layout: "two-up",
    props: {
      ...DEV,
      left_heading: "The palette in action",
      left_body: "bg-base rgb(11,12,17), accent-1 blue oklch(74% .145 245), accent-2 teal oklch(76% .145 155). Dark, editorial, opinionated.",
      right_heading: "The theme contract",
      right_body: "A theme overrides every --dk-color-* and the type families, ships the rgb()-before-oklch() cascade, and registers a theme_id. That's the whole contract.",
      divider: true,
    },
    notes: "Right pane is mirrored as a book-chrome checklist of the theme contract.",
    book_chrome: { visual: "theme-checklist" },
  },
  {
    id: "themes-contributing",
    section: "3.2 Contributing a theme",
    sectionId: "themes",
    primitive: "code",
    variant_label: "Contributing a theme",
    layout: "code",
    props: {
      ...DEV,
      heading: "A minimal theme file",
      code: '[data-theme="flagship"] {\n  --dk-color-bg-base: rgb(8, 10, 14);\n  --dk-color-bg-base: oklch(6% 0.02 270);\n  --dk-color-accent-1: rgb(255, 138, 96);\n  --dk-color-accent-1: oklch(78% 0.15 45);\n  --dk-type-family-display: "Your Font", system-ui, sans-serif;\n}\n',
      language: "css",
      caption: "rgb() first, oklch() second — the print-safe cascade.",
    },
    notes: "The 3-step contributor path is mirrored as book-chrome steps.",
    book_chrome: { visual: "theme-steps" },
  },

  // ── SECTION 4 — THE RULE ─────────────────────────────────────────────
  {
    id: "rule-statement",
    section: "4.0 The Rule",
    sectionId: "rule",
    primitive: "quote",
    variant_label: "The contract",
    layout: "quote",
    props: {
      ...DEV,
      quote: "The layout brain sets layout and content_props. It never writes CSS, style attributes, oklch values, or token names.",
      attribution: "DeckLee AGENTS.md",
      emphasis: "ruled",
    },
    notes: "The single governing constraint that makes DeckLee safe for LLM montage.",
    book_chrome: {},
  },
  {
    id: "rule-constraints",
    section: "4.1 Prop-only API",
    sectionId: "rule",
    primitive: "two-up",
    variant_label: "Prop-only API + constraints",
    layout: "two-up",
    props: {
      ...DEV,
      left_heading: "Why prop-only",
      left_body: "Stateless, slot-free, schema-validated props are the LLM safety boundary. If a value can't carry CSS, the model can't smuggle it in.",
      right_heading: "Content constraints",
      right_body: "Banned keys: class, className, css, style, token. No CSS-carrying strings. The code field is the one literal-text exception.",
      divider: true,
    },
    notes: "AGENTS.md at repo root is the authoritative ground truth; the book surfaces it visually.",
    book_chrome: { annotation: "Ground truth: /AGENTS.md (byte-identical, drift-checked)." },
  },

  // ── SECTION 5 — PRINT + CANVAS ───────────────────────────────────────
  {
    id: "scale-demo",
    section: "5.0 Scale formula",
    sectionId: "print",
    primitive: "two-up",
    variant_label: "Scale formula demo",
    layout: "two-up",
    props: {
      ...DEV,
      left_heading: "Scale, don't reflow",
      left_body: "scale = min(viewport_w / 1920, viewport_h / 1080), applied as transform: scale() with transform-origin center. The deck looks identical at any size.",
      right_heading: "Live scale",
      right_body: "The book-chrome readout shows the current computed scale in real time. With JS off, the formula text stands on its own.",
      divider: true,
    },
    notes: "Real-time scale readout is book-chrome JS (ResizeObserver) wired in BookLayout.",
    book_chrome: { annotation: "Current scale shown live in the chrome header." },
  },
  {
    id: "print-instructions",
    section: "5.1 Print",
    sectionId: "print",
    primitive: "hero",
    variant_label: "Print instructions",
    layout: "hero",
    props: {
      ...DEV,
      eyebrow: "05 / Platform",
      headline: "Press P — then Print",
      subheadline: "One slide per page. Chrome hidden. The oklch → sRGB cascade keeps print legible.",
    },
    notes: "P triggers window.print(); @media print hides .dk-book-chrome.",
    book_chrome: {},
  },

  // ── END CARD ─────────────────────────────────────────────────────────
  {
    id: "end",
    section: "End",
    sectionId: "end",
    primitive: "hero",
    variant_label: "End card",
    layout: "hero",
    props: {
      ...DEV,
      eyebrow: "Fin",
      headline: "That's the system. Now build a theme.",
      subheadline: "Read AGENTS.md at the repo root for the authoritative contract. Fork, theme, ship.",
      cta_label: "AGENTS.md · github.com/decklee",
    },
    notes: "Closing slide with pointers to the contract and the repo.",
    book_chrome: {},
  },
];

/** Section labels for the rail, in display order. */
const SECTION_LABELS: { id: string; label: string }[] = [
  { id: "cover", label: "Cover" },
  { id: "foundations", label: "Foundations" },
  { id: "primitives", label: "Primitives" },
  { id: "themes", label: "Themes" },
  { id: "rule", label: "The Rule" },
  { id: "print", label: "Print" },
  { id: "end", label: "End" },
];

/** Rail model — first slide index per section, derived from STORIES. */
export const SECTIONS: SectionNavItem[] = SECTION_LABELS.map(({ id, label }) => ({
  id,
  label,
  firstSlideIndex: STORIES.findIndex((s) => s.sectionId === id),
})).filter((s) => s.firstSlideIndex >= 0);

/** Index → {id, label} map baked for the StoryHeader live region. */
export const STORY_MAP: { index: number; id: string; label: string; primitive: string | null }[] =
  STORIES.map((s, index) => ({
    index,
    id: s.id,
    label: s.primitive ? `${titleCase(s.primitive)} — ${s.variant_label}` : s.section,
    primitive: s.primitive,
  }));

function titleCase(primitive: string): string {
  if (primitive === "two-up") return "Two-Up";
  return primitive.charAt(0).toUpperCase() + primitive.slice(1);
}
