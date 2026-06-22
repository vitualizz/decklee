/**
 * hero.demo.ts — Hero primitive playground fixture.
 *
 * Plain .ts (NO glob). Variants minimal/full-stack/image-bg are ported
 * verbatim from the original STORIES[] hero stories; `overflow` is the new
 * FR-9 stress case. Every variant carries theme_id:'dev'.
 */
import Hero from "@decklee/design-system/primitives/Hero.astro";
import type { HeroProps } from "@decklee/schema";
import type { PlayFixture } from "../play.js";

const PLACEHOLDER_IMG = "/img/placeholder.svg";

const fixture: PlayFixture<HeroProps & { theme_id: string }> = {
  name: "hero",
  title: "Hero",
  component: Hero,
  tier: "locked",
  variants: [
    {
      name: "minimal",
      props: { theme_id: "dev", headline: "Minimal Hero" },
      note: "Headline only — base state, max typographic weight.",
    },
    {
      name: "full-stack",
      props: {
        theme_id: "dev",
        eyebrow: "Section 01",
        headline: "The Full Stack",
        subheadline: "Every optional text slot populated at once.",
        cta_label: "→ Next",
      },
      note: "All text slots filled — accent-1 eyebrow, accent-2 CTA.",
    },
    {
      name: "image-bg",
      props: {
        theme_id: "dev",
        headline: "Image Behind",
        background_treatment: "image",
        image_src: PLACEHOLDER_IMG,
        image_alt: "Abstract dark concentric field, an on-brand placeholder backdrop.",
      },
      note: "Verify overlay legibility (4.5:1) for any real image.",
    },
    {
      name: "overflow",
      props: {
        theme_id: "dev",
        headline:
          "A very very very long headline that overflows the available space to test clamp behavior across all viewport widths and responsive breakpoints",
      },
      stress: true,
      note: "Intentional overflow stress case.",
    },
  ],
};

export default fixture;
