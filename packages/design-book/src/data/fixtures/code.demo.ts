/**
 * code.demo.ts — Code primitive playground fixture.
 *
 * Plain .ts (NO glob). bare/heading-caption/highlighted ported from the
 * original STORIES[] code stories; `overflow` is a generated 40-line FR-9
 * stress case.
 */
import Code from "@decklee/design-system/primitives/Code.astro";
import type { CodeProps } from "@decklee/schema";
import type { PlayFixture } from "../play.js";

const OVERFLOW_LINE_COUNT = 40;
const overflowCode = Array.from(
  { length: OVERFLOW_LINE_COUNT },
  (_, i) =>
    `const line_${i} = ${i}; // a long-enough comment to force horizontal scroll within the code block stress test\n`,
).join("");

const fixture: PlayFixture<CodeProps & { theme_id: string }> = {
  name: "code",
  title: "Code",
  component: Code,
  tier: "locked",
  variants: [
    {
      name: "bare",
      props: {
        theme_id: "dev",
        code: "const deck = loadDeck('design-book');\n",
        language: "typescript",
      },
      note: "No heading/highlight/caption — code + language required.",
    },
    {
      name: "heading-caption",
      props: {
        theme_id: "dev",
        heading: "The Schema",
        code: '{\n  "schema_version": "1",\n  "kind": "deck"\n}\n',
        language: "json",
        caption: 'schema_version is always the string "1".',
      },
      note: "Heading above, caption below.",
    },
    {
      name: "highlighted",
      props: {
        theme_id: "dev",
        code: "export const STORY = {\n  layout: 'hero',\n  content_props: {\n    headline: 'Highlighted',\n  },\n};\n",
        language: "typescript",
        highlight_lines: [3, 4, 5],
      },
      note: "highlight_lines uses a non-color border marker.",
    },
    {
      name: "overflow",
      props: {
        theme_id: "dev",
        code: overflowCode,
        language: "typescript",
      },
      stress: true,
      note: "Intentional vertical + horizontal overflow stress case.",
    },
  ],
};

export default fixture;
