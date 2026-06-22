/**
 * Public API barrel for @decklee/viewer. This is the bundle entry consumed by
 * @decklee/core. Importing it is side-effect-free: boot() is exported, never
 * invoked here, so tests and tooling can import the surface without booting.
 */
export { renderSlide, renderDeck } from "./render/index.js";
export { renderHero } from "./render/hero.js";
export { renderTwoUp } from "./render/two-up.js";
export { renderCode } from "./render/code.js";
export { renderQuote } from "./render/quote.js";
export { boot } from "./boot.js";
export { configureReveal, REVEAL_CONFIG } from "./reveal-config.js";
export { renderErrorPanel } from "./error-panel.js";
export { NO_JS_MESSAGE } from "./no-js.js";
