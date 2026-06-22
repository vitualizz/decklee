/**
 * two-up.demo.ts — Two-Up primitive playground fixture.
 *
 * Plain .ts (NO glob). text-only/headings-divider/image-pane ported from the
 * original STORIES[] two-up stories; `overflow` is the FR-9 stress case.
 */
import TwoUp from "@decklee/design-system/primitives/TwoUp.astro";
import type { TwoUpProps } from "@decklee/schema";
import type { PlayFixture } from "../play.js";

const PLACEHOLDER_IMG = "/img/placeholder.svg";

const fixture: PlayFixture<TwoUpProps & { theme_id: string }> = {
  name: "two-up",
  title: "Two-Up",
  component: TwoUp,
  tier: "locked",
  variants: [
    {
      name: "text-only",
      props: {
        theme_id: "dev",
        left_body: "The problem: layout brains drift into CSS and break the contract.",
        right_body:
          "The solution: stateless, schema-validated props. No styling reaches the model.",
      },
      note: "Simplest form — divider default, no headings.",
    },
    {
      name: "headings-divider",
      props: {
        theme_id: "dev",
        left_heading: "Before",
        left_body: "Bespoke decks: every slide a one-off, every theme a rewrite.",
        right_heading: "After",
        right_body: "One token swap rebinds the whole identity. The components never change.",
        divider: true,
      },
      note: "Both panes headed, divider explicit.",
    },
    {
      name: "image-pane",
      props: {
        theme_id: "dev",
        left_type: "image",
        left_image_src: PLACEHOLDER_IMG,
        left_image_alt: "Abstract dark concentric field, an on-brand placeholder image.",
        left_body: "Fallback text used only when the image is absent.",
        right_heading: "Context",
        right_body:
          "left_type='image' turns the left pane into an image; the right pane stays text.",
      },
      note: "left_type='image' requires left_image_src + left_image_alt; both bodies still required.",
    },
    {
      name: "overflow",
      props: {
        theme_id: "dev",
        left_heading: "Overflow",
        left_body:
          "A deliberately long body paragraph repeated to overrun the available pane height and exercise clamp/overflow behavior under stress so we can see how the layout copes when content exceeds the intended bound on a single slide canvas.",
        right_body: "Right side intentionally short.",
      },
      stress: true,
      note: "Intentional pane-overflow stress case.",
    },
  ],
};

export default fixture;
