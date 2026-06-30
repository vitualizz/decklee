/**
 * Public API barrel for @decklee/core — the maintainer-time deck assembler.
 */
export type { AssembleOpts } from "./assemble.js";
export { injectDeck, safeJsonForHtml } from "./inject.js";
export { emitDeck } from "./emit.js";
export type { EmitOpts } from "./emit.js";
