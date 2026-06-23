/**
 * Render dispatch. renderSlide builds the per-layout primitive root (a
 * <div data-layout> or, for quote, a <figure>); renderDeck wraps each one in a
 * reveal.js slide <section> that carries the deck-level aria-label
 * ("Slide N of T") and the speaker-notes <aside>.
 *
 * Why the slide <section> wrapper lives here and NOT on the primitive root:
 * reveal.js forces inline `display:block` on whatever <section> it treats as a
 * slide, which would clobber a primitive's own layout display (e.g. TwoUp's
 * `display:grid` collapses to a stack). Keeping the primitive root a <div>
 * inside a wrapper <section> lets reveal own the slide while the primitive owns
 * its layout. The primitive renderers stay pure parity twins of the .astro
 * primitives — the <section> seam is a viewer-only concern.
 */
import type { DeckJson, Slide } from "@decklee/schema";

import { renderHero } from "./hero.js";
import { renderTwoUp } from "./two-up.js";
import { renderCode } from "./code.js";
import { renderQuote } from "./quote.js";

/**
 * Build the primitive root element for a single slide (no slide wrapper, no
 * notes — those belong to the renderDeck <section> seam). Throws on an unknown
 * layout so boot.ts can route the failure into the error panel.
 */
export function renderSlide(slide: Slide): HTMLElement {
  return dispatch(slide);
}

function dispatch(slide: Slide): HTMLElement {
  switch (slide.layout) {
    case "hero":
      return renderHero(slide.content_props);
    case "two-up":
      return renderTwoUp(slide.content_props);
    case "code":
      return renderCode(slide.content_props);
    case "quote":
      return renderQuote(slide.content_props);
    default: {
      // Exhaustiveness guard: a valid Slide cannot reach here, but a deck that
      // passed an out-of-band layout (caught before validation) lands here.
      const unknown = slide as { layout: string };
      throw new Error(`Unknown layout: ${unknown.layout}`);
    }
  }
}

/**
 * Render every slide in order as a reveal.js slide <section>, tagging each with
 * its position for screen readers and attaching speaker notes when present.
 * O(N); performs no re-validation (the deck is already validated).
 */
export function renderDeck(deck: DeckJson): HTMLElement[] {
  const total = deck.slides.length;
  return deck.slides.map((slide, index) => {
    const section = document.createElement("section");
    section.setAttribute("aria-label", `Slide ${index + 1} of ${total}`);
    section.appendChild(renderSlide(slide));

    if (slide.speaker_notes) {
      const notes = document.createElement("aside");
      notes.className = "notes";
      notes.textContent = slide.speaker_notes;
      section.appendChild(notes);
    }

    return section;
  });
}
