export { OutlineSchema } from "./outline.schema.js";
export { DeckSchema } from "./deck.schema.js";
// Re-exported so @decklee/cli's contract generator can introspect each primitive's
// Zod shape directly from the barrel (R1) without a package-boundary-violating deep import.
export {
  HeroPropsSchema,
  TwoUpPropsSchema,
  CodePropsSchema,
  QuotePropsSchema,
  SlideSchema,
  DeckMetaSchema,
} from "./deck.schema.js";
export {
  BANNED_KEYS,
  STYLE_PAYLOAD_PATTERN,
  StylePayloadError,
  assertNoStylePayload,
  validateOutline,
  validateDeck,
  safeValidateOutline,
  safeValidateDeck,
} from "./validators.js";
export type { ValidationResult, FieldError } from "./validators.js";
