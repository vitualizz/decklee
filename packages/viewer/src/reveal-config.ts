/**
 * reveal.js wiring — the ONLY module besides boot.ts allowed to import reveal
 * (R-003). render/* must never reach for it. The config object is exported so
 * unit tests can assert the canonical values without constructing a Reveal
 * instance (which touches layout APIs absent under jsdom).
 */
import Reveal from "reveal.js";
import RevealNotes from "reveal.js/plugin/notes";

/**
 * The ten canonical deck settings (AC-01). DeckLee fixes a 1920x1080 stage with
 * no centering and a fade transition; the slide number reads "current/total".
 */
export const REVEAL_CONFIG = {
  width: 1920,
  height: 1080,
  margin: 0,
  minScale: 0.1,
  maxScale: 2,
  center: false,
  hash: true,
  controls: true,
  progress: true,
  slideNumber: "c/t",
  transition: "fade",
  plugins: [RevealNotes],
} as const;

/**
 * Construct and initialize a Reveal instance over `root` (defaults to the first
 * `.reveal` element). Reveal 6 uses the constructor form
 * `new Reveal(el, config).initialize()` (verified against the reference layout),
 * NOT the static `Reveal.initialize()`.
 */
export function configureReveal(root?: HTMLElement): void {
  const el = root ?? document.querySelector<HTMLElement>(".reveal");
  if (!el) {
    throw new Error('configureReveal: no ".reveal" root element found');
  }
  const deck = new Reveal(el, REVEAL_CONFIG);
  deck.initialize();
}
