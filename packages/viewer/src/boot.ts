/**
 * Client-side boot sequence (AC-01, AC-02, AC-04, AC-05):
 * parse the #decklee-deck JSON island → validate → render slides → init reveal.
 * On any failure the deck is NOT initialized; an accessible error panel shows
 * instead. boot() does NOT auto-run on import — @decklee/core calls it.
 */
import { safeValidateDeck } from "@decklee/schema";
import type { FieldError } from "@decklee/schema";

import { renderDeck } from "./render/index.js";
import { renderErrorPanel } from "./error-panel.js";
import { configureReveal } from "./reveal-config.js";

const ISLAND_ID = "decklee-deck";
const REVEAL_SELECTOR = ".reveal";
const SLIDES_SELECTOR = ".reveal .slides";

/**
 * Register the boot handler. Runs immediately when the document has already
 * finished loading, otherwise waits for DOMContentLoaded. Safe to call once.
 */
export function boot(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
    return;
  }
  run();
}

function run(): void {
  const island = document.getElementById(ISLAND_ID);
  const text = island?.textContent ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    renderErrorPanel([
      { path: "root", message: "Invalid JSON in deck island", code: "invalid_json" },
    ]);
    return;
  }

  const result = safeValidateDeck(parsed);
  if (!result.ok) {
    renderErrorPanel(result.errors);
    return;
  }

  try {
    const slides = renderDeck(result.data);
    const container = document.querySelector(SLIDES_SELECTOR);
    if (!container) {
      throw new Error(`Missing "${SLIDES_SELECTOR}" container`);
    }
    for (const slide of slides) {
      container.appendChild(slide);
    }

    const reveal = document.querySelector(REVEAL_SELECTOR);
    if (!reveal) {
      throw new Error(`Missing "${REVEAL_SELECTOR}" root`);
    }
    reveal.setAttribute("data-theme", result.data.meta.theme_id);

    configureReveal(reveal as HTMLElement);
  } catch (error) {
    renderErrorPanel([toFieldError(error)]);
  }
}

function toFieldError(error: unknown): FieldError {
  const message = error instanceof Error ? error.message : String(error);
  const isUnknownLayout = message.startsWith("Unknown layout:");
  return {
    path: isUnknownLayout ? "slides[].layout" : "root",
    message,
    code: isUnknownLayout ? "unknown_layout" : "render_error",
  };
}
