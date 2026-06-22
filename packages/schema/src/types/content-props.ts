/**
 * Per-layout content_props shapes. These mirror the primitive prop APIs.
 * theme_id deliberately does NOT appear here — it lives only at deck.meta.
 */

export type BackgroundTreatment = "color" | "image" | "gradient";

export interface HeroProps {
  headline: string;
  subheadline?: string;
  eyebrow?: string;
  background_treatment?: BackgroundTreatment;
  image_src?: string;
  image_alt?: string;
  cta_label?: string;
}

export type TwoUpItemType = "text" | "image" | "stat";

export interface TwoUpProps {
  left_body: string;
  right_body: string;
  left_heading?: string;
  right_heading?: string;
  left_type?: TwoUpItemType;
  right_type?: TwoUpItemType;
  left_image_src?: string;
  left_image_alt?: string;
  right_image_src?: string;
  right_image_alt?: string;
  divider?: boolean;
}

export interface CodeProps {
  /** R-002 EXEMPT for VALUE only — the code body may legitimately contain CSS. */
  code: string;
  language: string;
  heading?: string;
  highlight_lines?: number[];
  caption?: string;
}

export type QuoteEmphasis = "full" | "centered" | "ruled";

export interface QuoteProps {
  quote: string;
  attribution?: string;
  context?: string;
  emphasis?: QuoteEmphasis;
}

/** Discriminated union of the four content_props shapes, keyed by layout. */
export type ContentProps =
  | { layout: "hero"; content_props: HeroProps }
  | { layout: "two-up"; content_props: TwoUpProps }
  | { layout: "code"; content_props: CodeProps }
  | { layout: "quote"; content_props: QuoteProps };
