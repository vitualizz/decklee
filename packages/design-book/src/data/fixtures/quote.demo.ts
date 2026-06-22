/**
 * quote.demo.ts — Quote primitive playground fixture.
 *
 * Plain .ts (NO glob). minimal/attribution-context/ruled ported from the
 * original STORIES[] quote stories; `overflow` is the FR-9 stress case.
 */
import Quote from "@decklee/design-system/primitives/Quote.astro";
import type { QuoteProps } from "@decklee/schema";
import type { PlayFixture } from "../play.js";

const fixture: PlayFixture<QuoteProps & { theme_id: string }> = {
  name: "quote",
  title: "Quote",
  component: Quote,
  tier: "locked",
  variants: [
    {
      name: "minimal",
      props: { theme_id: "dev", quote: "Ship the contract, not the chaos." },
      note: "No attribution — emphasis defaults to 'centered'.",
    },
    {
      name: "attribution-context",
      props: {
        theme_id: "dev",
        quote: "The best abstraction is the one the model can't misuse.",
        attribution: "Lee Palacios",
        context: "DeckLee, 2026",
      },
      note: "Attribution + context populate the figcaption.",
    },
    {
      name: "ruled",
      props: {
        theme_id: "dev",
        quote: "A theme is a contract, not a coat of paint.",
        attribution: "DeckLee",
        emphasis: "ruled",
      },
      note: "emphasis='ruled' adds an accent-1 left border (3:1 min).",
    },
    {
      name: "overflow",
      props: {
        theme_id: "dev",
        quote:
          "A very long pull-quote sentence repeated and extended well past the comfortable single-line measure to test how the quote layout wraps and scales under an intentionally oversized testimony string on the deck canvas.",
      },
      stress: true,
      note: "Intentional long-quote stress case.",
    },
  ],
};

export default fixture;
