import type {
  CodeProps,
  HeroProps,
  QuoteProps,
  TwoUpProps,
} from "./content-props.js";

/** Closed layout enum. */
export type Layout = "hero" | "two-up" | "code" | "quote";

export interface DeckMeta {
  title: string;
  /** The ONLY location theme_id appears in the entire deck tree. */
  theme_id: string;
  source_outline_id: string | null;
}

interface SlideBase {
  id: string;
  speaker_notes: string | null;
}

export interface HeroSlide extends SlideBase {
  layout: "hero";
  content_props: HeroProps;
}

export interface TwoUpSlide extends SlideBase {
  layout: "two-up";
  content_props: TwoUpProps;
}

export interface CodeSlide extends SlideBase {
  layout: "code";
  content_props: CodeProps;
}

export interface QuoteSlide extends SlideBase {
  layout: "quote";
  content_props: QuoteProps;
}

export type Slide = HeroSlide | TwoUpSlide | CodeSlide | QuoteSlide;

export interface DeckJson {
  schema_version: "1";
  kind: "deck";
  id: string;
  meta: DeckMeta;
  slides: Slide[];
}
