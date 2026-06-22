/**
 * Render dispatch. renderSlide builds the per-layout root element and appends
 * the speaker-notes <aside> when present; renderDeck owns the deck-level
 * aria-label ("Slide N of T") because only it knows each slide's index/total.
 */
import type { DeckJson, Slide } from "@decklee/schema";

import { renderHero } from "./hero.js";
import { renderTwoUp } from "./two-up.js";
import { renderCode } from "./code.js";
import { renderQuote } from "./quote.js";

/**
 * Build the root element for a single slide. Throws on an unknown layout so
 * boot.ts can route the failure into the error panel. The speaker-notes aside
 * (consumed by the reveal.js notes plugin) lives inside the slide root.
 */
export function renderSlide(slide: Slide): HTMLElement {
  const element = dispatch(slide);

  if (slide.speaker_notes) {
    const notes = document.createElement("aside");
    notes.className = "notes";
    notes.textContent = slide.speaker_notes;
    element.appendChild(notes);
  }

  return element;
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
 * Render every slide in order, tagging each root with its position for screen
 * readers. O(N); performs no re-validation (the deck is already validated).
 */
export function renderDeck(deck: DeckJson): HTMLElement[] {
  const total = deck.slides.length;
  return deck.slides.map((slide, index) => {
    const element = renderSlide(slide);
    element.setAttribute("aria-label", `Slide ${index + 1} of ${total}`);
    return element;
  });
}
