/**
 * Canonical schema lineage anchor. No semver parsing happens in this package —
 * version-skew logic is deferred to @decklee/core.
 */
export const SCHEMA_VERSION = "1" as const;

/** Closed set of valid layout primitive ids. Order is significant for UIs that list layouts. */
export const LAYOUT_IDS = ["hero", "two-up", "code", "quote"] as const;
