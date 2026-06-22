import { z } from "zod";
import { SCHEMA_VERSION } from "../constants.js";
import type { DeckJson } from "../types/deck.js";

export const HeroPropsSchema = z
  .strictObject({
    headline: z.string(),
    subheadline: z.string().optional(),
    eyebrow: z.string().optional(),
    background_treatment: z.enum(["color", "image", "gradient"]).optional(),
    image_src: z.string().optional(),
    image_alt: z.string().optional(),
    cta_label: z.string().optional(),
  })
  .superRefine((props, ctx) => {
    if (props.background_treatment === "image" && props.image_src === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["image_src"],
        message:
          "background_treatment is 'image' but image_src is missing — an image background requires a source.",
      });
    }
    if (props.image_src !== undefined && props.image_alt === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["image_alt"],
        message: "image_src is present but image_alt is missing — every image needs alt text.",
      });
    }
  });

export const TwoUpPropsSchema = z
  .strictObject({
    left_body: z.string(),
    right_body: z.string(),
    left_heading: z.string().optional(),
    right_heading: z.string().optional(),
    left_type: z.enum(["text", "image", "stat"]).optional(),
    right_type: z.enum(["text", "image", "stat"]).optional(),
    left_image_src: z.string().optional(),
    left_image_alt: z.string().optional(),
    right_image_src: z.string().optional(),
    right_image_alt: z.string().optional(),
    divider: z.boolean().optional(),
  })
  .superRefine((props, ctx) => {
    if (props.left_type === "image" && props.left_image_src === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["left_image_src"],
        message: "left_type is 'image' but left_image_src is missing.",
      });
    }
    if (props.left_image_src !== undefined && props.left_image_alt === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["left_image_alt"],
        message: "left_image_src is present but left_image_alt is missing — every image needs alt text.",
      });
    }
    if (props.right_type === "image" && props.right_image_src === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["right_image_src"],
        message: "right_type is 'image' but right_image_src is missing.",
      });
    }
    if (props.right_image_src !== undefined && props.right_image_alt === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["right_image_alt"],
        message: "right_image_src is present but right_image_alt is missing — every image needs alt text.",
      });
    }
  });

export const CodePropsSchema = z.strictObject({
  code: z.string(),
  language: z.string(),
  heading: z.string().optional(),
  // highlight_lines: 1-based line numbers — both .int() and .min(1) are required.
  highlight_lines: z.array(z.number().int().min(1)).optional(),
  caption: z.string().optional(),
});

export const QuotePropsSchema = z.strictObject({
  quote: z.string(),
  attribution: z.string().optional(),
  context: z.string().optional(),
  emphasis: z.enum(["full", "centered", "ruled"]).optional(),
});

const HeroSlideSchema = z.strictObject({
  id: z.string(),
  layout: z.literal("hero"),
  content_props: HeroPropsSchema,
  speaker_notes: z.string().nullable(),
});

const TwoUpSlideSchema = z.strictObject({
  id: z.string(),
  layout: z.literal("two-up"),
  content_props: TwoUpPropsSchema,
  speaker_notes: z.string().nullable(),
});

const CodeSlideSchema = z.strictObject({
  id: z.string(),
  layout: z.literal("code"),
  content_props: CodePropsSchema,
  speaker_notes: z.string().nullable(),
});

const QuoteSlideSchema = z.strictObject({
  id: z.string(),
  layout: z.literal("quote"),
  content_props: QuotePropsSchema,
  speaker_notes: z.string().nullable(),
});

export const SlideSchema = z.discriminatedUnion("layout", [
  HeroSlideSchema,
  TwoUpSlideSchema,
  CodeSlideSchema,
  QuoteSlideSchema,
]);

// theme_id appears ONLY here — strictObject on content_props structurally rejects it elsewhere.
export const DeckMetaSchema = z.strictObject({
  title: z.string(),
  theme_id: z.string(),
  source_outline_id: z.string().nullable(),
});

export const DeckSchema: z.ZodType<DeckJson> = z.strictObject({
  schema_version: z.literal(SCHEMA_VERSION),
  kind: z.literal("deck"),
  id: z.string(),
  meta: DeckMetaSchema,
  slides: z.array(SlideSchema),
});
