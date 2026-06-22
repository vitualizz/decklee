/**
 * Quote layout twin — DOM-identical to Quote.astro
 * (see __snapshots__/Quote.test.ts.snap). The root is a <figure> (NOT a
 * <section>); the figcaption appears only when attribution or context is given.
 */
import type { QuoteEmphasis, QuoteProps } from "@decklee/schema";

const DEFAULT_EMPHASIS: QuoteEmphasis = "centered";

export function renderQuote(props: QuoteProps): HTMLElement {
  const figure = document.createElement("figure");
  figure.className = "dk-quote";
  figure.setAttribute("data-layout", "quote");
  figure.setAttribute("data-emphasis", props.emphasis ?? DEFAULT_EMPHASIS);

  const text = document.createElement("blockquote");
  text.className = "dk-quote__text";
  text.textContent = props.quote;
  figure.appendChild(text);

  if (props.attribution || props.context) {
    const caption = document.createElement("figcaption");
    caption.className = "dk-quote__caption";

    if (props.attribution) {
      const attr = document.createElement("span");
      attr.className = "dk-quote__attr";
      attr.textContent = props.attribution;
      caption.appendChild(attr);
    }

    if (props.context) {
      const context = document.createElement("span");
      context.className = "dk-quote__context";
      context.textContent = props.context;
      caption.appendChild(context);
    }

    figure.appendChild(caption);
  }

  return figure;
}
