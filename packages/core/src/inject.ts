/**
 * Deck injection — validate a deck (throwing) then splice its safely-escaped
 * JSON into the template's <script type="application/json" id="decklee-deck">
 * island. Pure string transform; no disk, no DOM.
 */
import { validateDeck } from "@decklee/schema";

/** Anchored on the island's open tag so any prior island content (e.g. `{}`) is replaced. */
const ISLAND_RE = /(id="decklee-deck">)([\s\S]*?)(<\/script>)/;

/**
 * Escape a value's JSON so it is safe to embed verbatim as the text content of
 * an HTML <script> element AND still round-trip through JSON.parse (which is
 * how @decklee/viewer's boot() reads the island).
 *
 * Strategy: escape every `<` to its \u003c form. This is the single
 * escape that is BOTH valid JSON (parses back to `<`) and neutralises every
 * HTML-significant sequence inside a <script>: `</script>` (would close the
 * element), `<!--` (would open a comment), and `<script>`. A literal `<\/script>`
 * or `<\!--` escape — as some guides suggest — instead emits `\!`, which is
 * NOT a valid JSON escape and makes JSON.parse throw in the browser.
 *
 * U+2028 / U+2029 are valid JSON but are raw line terminators in JS string
 * literals; escaping them keeps the island parseable on older engines. The
 * regex sources use \u2028/\u2029 escapes (the raw chars are JS line
 * terminators and would break this source file itself).
 */
export function safeJsonForHtml(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Validate `deck` and inject it into `templateHtml`'s deck island.
 *
 * @throws ZodError when the deck fails schema validation.
 * @throws Error when the template has no decklee-deck island.
 */
export function injectDeck(templateHtml: string, deck: unknown): string {
  const valid = validateDeck(deck);
  const json = safeJsonForHtml(valid);

  if (!ISLAND_RE.test(templateHtml)) {
    throw new Error(
      "injectDeck: template does not contain a valid decklee-deck island",
    );
  }

  // Function replacer (not a `$1`-style string): JSON.stringify output may
  // contain `$&`/`$1`, which the string-replacement form would interpolate and
  // corrupt. The replacer treats `json` as an opaque literal.
  return templateHtml.replace(ISLAND_RE, (_match, open, _prev, close) => {
    return `${open}${json}${close}`;
  });
}
