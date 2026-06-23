/**
 * agents-md.ts — the single source of truth for the AI-assistant contract.
 *
 * `generateAgentsMd()` is a PURE, DETERMINISTIC function: given the same
 * imported schema/design-system symbols it returns a byte-identical string on
 * every call. That determinism is what the drift-check test relies on — the
 * committed /AGENTS.md must equal this function's in-process output.
 *
 * It derives the primitive prop tables straight from the Zod schemas so the
 * contract can never drift from the validator. The ONLY hand-maintained datum
 * is THEME_VOICE_MAP (see its doc comment).
 */
import {
  SCHEMA_VERSION,
  LAYOUT_IDS,
  BANNED_KEYS,
  buildPropTable,
  PROP_SCHEMAS,
} from "@decklee/schema";
import type { PropRow } from "@decklee/schema";
import { getRegisteredThemes } from "@decklee/design-system";

/**
 * Human voice/identity per theme. This is the ONE manual-maintenance constant
 * in the generator: when a new theme is registered in @decklee/design-system,
 * add its one-line voice here. A theme present in getRegisteredThemes() but
 * missing here renders with an empty voice cell (never crashes).
 */
const THEME_VOICE_MAP: Record<string, string> = {
  dev: "Dark editorial — Space Grotesk / Instrument Sans / JetBrains Mono, oklch accents",
  aurora: "Dark cosmic — premium, cinematic blue→violet gradient canvas with an electric headline glow",
};

function renderPropTable(rows: PropRow[]): string {
  const header = "| Prop | Type | Required |\n| --- | --- | --- |";
  const body = rows
    .map((r) => `| \`${r.name}\` | \`${r.type}\` | ${r.required ? "yes" : "no"} |`)
    .join("\n");
  return `${header}\n${body}`;
}

function renderThemeCatalog(): string {
  const header = "| theme_id | Voice |\n| --- | --- |";
  const body = getRegisteredThemes()
    .map((id) => `| \`${id}\` | ${THEME_VOICE_MAP[id] ?? ""} |`)
    .join("\n");
  return `${header}\n${body}`;
}

/** Hardcoded minimal 2-slide deck shape — the canonical envelope the assistant emits. */
const DECK_JSON_SHAPE = `\`\`\`json
{
  "schema_version": "${SCHEMA_VERSION}",
  "kind": "deck",
  "id": "deck-001",
  "meta": { "title": "My Talk", "theme_id": "dev", "source_outline_id": null },
  "slides": [
    {
      "id": "s1",
      "layout": "hero",
      "content_props": { "headline": "A Better Process" },
      "speaker_notes": "Open with the pain."
    },
    {
      "id": "s2",
      "layout": "quote",
      "content_props": { "quote": "Ship the contract, not the chaos.", "attribution": "DeckLee" },
      "speaker_notes": "Land the thesis."
    }
  ]
}
\`\`\``;

const THE_RULE = `You emit ONLY validated Deck JSON conforming to the schema below.
You NEVER write CSS, HTML, inline styles, \`<style>\` blocks, color values, or
markup of any kind. Styling is the theme's job, not the payload's. DeckLee
renders your JSON into reveal.js HTML — your only contract is the data.`;

/**
 * The full AGENTS.md contract as a deterministic string. Section order is fixed
 * (drift-check pins byte-equality). The version comment on the first line MUST
 * equal SCHEMA_VERSION (CI-01).
 */
export function generateAgentsMd(): string {
  const banned = [...BANNED_KEYS].sort().map((k) => `\`${k}\``).join(", ");

  const primitives = LAYOUT_IDS.map((id) => {
    const schema = PROP_SCHEMAS[id];
    return `### ${id}\n\n${renderPropTable(buildPropTable(schema))}`;
  }).join("\n\n");

  return `<!-- decklee-agents-md-version: ${SCHEMA_VERSION} -->
<!-- GENERATED FILE — do not edit by hand. -->
<!-- Regenerate with: pnpm --filter decklee generate:agents-md -->

# DeckLee — Deck Authoring Contract

## THE RULE

${THE_RULE}

## PRIMITIVES REFERENCE

Each slide has a \`layout\` (one of: ${LAYOUT_IDS.map((l) => `\`${l}\``).join(", ")}) and a
\`content_props\` object whose allowed fields are listed below. Unknown fields are
rejected (strict). \`speaker_notes\` is a string or null on every slide.

${primitives}

## DECK JSON SHAPE

${DECK_JSON_SHAPE}

## THEME CATALOG

\`theme_id\` appears EXACTLY ONCE, at \`meta.theme_id\`. Never put it inside a slide
or \`content_props\`.

${renderThemeCatalog()}

## CONTENT CONSTRAINTS

- HC-03: these keys are banned ANYWHERE in \`content_props\`: ${banned}.
- No CSS-carrying string values (no \`oklch(\`, hex colors, \`rgb(\`, \`<style\`, \`style=\`).
- The lone exemption: the literal \`code\` field value on a \`code\` slide may contain
  source that incidentally matches those patterns.

## VERSION PIN

This contract targets DeckLee schema version \`${SCHEMA_VERSION}\`.
`;
}
