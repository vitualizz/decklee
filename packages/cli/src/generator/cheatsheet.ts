/**
 * cheatsheet.ts — a compact single-block reference of all four primitives.
 * Required props are marked ★, optional ○. Reuses the schema introspection
 * from agents-md.ts so it can never drift from the validator.
 */
import { LAYOUT_IDS, buildPropTablesByLayout } from "@decklee/schema";

const REQUIRED_MARK = "★";
const OPTIONAL_MARK = "○";

/** Compact one-block all-primitives prop reference. */
export function generateCheatsheet(): string {
  const tables = buildPropTablesByLayout();
  const blocks = LAYOUT_IDS.map((id) => {
    const props = tables[id]
      .map((p) => `${p.required ? REQUIRED_MARK : OPTIONAL_MARK} ${p.name}: ${p.type}`)
      .join("\n  ");
    return `${id}\n  ${props}`;
  });
  return `DeckLee primitives (${REQUIRED_MARK}=required ${OPTIONAL_MARK}=optional)\n\n${blocks.join("\n\n")}\n`;
}
