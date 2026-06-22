/**
 * skill-wrappers.ts — wraps the single AGENTS.md contract into the per-target
 * skill formats. Both the generic and Claude wrappers embed the SAME AGENTS.md
 * body produced by generateAgentsMd(), so the drift-check can pin all three
 * artifacts to one source.
 */
import { generateAgentsMd } from "./agents-md.js";

const GENERIC_README = `# DeckLee Skill (generic)

Give your AI assistant the DeckLee deck-authoring contract.

1. Open \`AGENTS.md\` in this folder.
2. Paste its full contents into your assistant's system prompt, custom
   instructions, or knowledge base.
3. Ask the assistant for a deck — it will reply with validated Deck JSON only.
4. Save the JSON and run \`decklee build deck.json\` to render reveal.js HTML.
`;

const CLAUDE_README = `# DeckLee Skill (Claude)

Add DeckLee to a Claude Project as a Skill.

1. In Claude.ai → Projects → open or create a project.
2. Add to project → upload \`SKILL.md\` from this folder.
3. Ask Claude for a deck — it will reply with validated Deck JSON only.
4. Save the JSON and run \`decklee build deck.json\` to render reveal.js HTML.
`;

const CLAUDE_FRONTMATTER = `---
name: DeckLee
description: Create presentation decks as validated JSON — DeckLee renders them into reveal.js HTML
version: "1.0"
tools: []
---

`;

/**
 * Build the generic + Claude skill wrappers. generic['AGENTS.md'] is the raw
 * contract; claude['SKILL.md'] is YAML frontmatter + the same contract body.
 */
export function generateSkillWrappers(): {
  generic: Record<string, string>;
  claude: Record<string, string>;
} {
  const agentsMd = generateAgentsMd();
  return {
    generic: {
      "AGENTS.md": agentsMd,
      "README.md": GENERIC_README,
    },
    claude: {
      "SKILL.md": `${CLAUDE_FRONTMATTER}${agentsMd}`,
      "README.md": CLAUDE_README,
    },
  };
}
