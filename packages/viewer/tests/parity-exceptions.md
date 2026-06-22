# Parity Exceptions (R-NEW-01)

This document records ALL known, intentional divergences between the viewer twin
DOM and the committed Astro design-system snapshots. These exceptions are
NORMALIZATION rules applied before the `expect(normalize(twin)).toEqual(normalize(snap))`
assertion in `src/render/parity.test.ts`.

---

## (a) Astro `data-astro-*` attributes — STRIPPED

**What**: Astro's dev-mode rendering injects three attribute families on every
element it touches:
- `data-astro-cid-<hash>` (e.g. `data-astro-cid-yavstnxy`) — scoped-CSS class
  hash, unique per component.
- `data-astro-source-file="<abs-path>"` — source file path for debugging.
- `data-astro-source-loc="L:C"` — line:column position in the source file.

**Why stripped**: These attributes are Astro compiler artifacts. The viewer twin
is framework-free and never emits them. They carry no semantic meaning for the
rendered presentation and are not part of the public DOM contract.

**Normalization rule**: Any attribute whose name starts with `data-astro-` is
excluded from the `attrs` object in `normalize(el)`.

---

## (b) Whitespace-only text nodes — SKIPPED

**What**: Astro's template renderer emits whitespace text nodes (single spaces
or newlines) between element children and around conditional blocks. For example,
an absent `{eyebrow && <p>…</p>}` conditional leaves a stray space in the
serialized HTML.

**Why skipped**: The viewer twin builds DOM via `document.createElement` +
`appendChild`, which produces no inter-element whitespace text nodes.

**Normalization rule**: In `normalize(el).children`, any `Text` node whose
`textContent.trim()` is `""` is excluded from the children array.

---

## (c) hljs token span class names inside `<code>` — TEXT-ONLY assertion

**What**: The `highlight()` function (from `@decklee/design-system`) wraps code
tokens in `<span class="hljs-keyword">`, `<span class="hljs-string">`, etc.
The specific class names emitted depend on the highlight.js grammar version and
the language grammar in use. They CAN differ between the snapshot (recorded at
design-system build time) and the twin (using the same library at the same
version — but grammar output can vary with minor lib updates).

**Why text-only**: Coupling the parity test to exact inner hljs span structures
would make it brittle to highlight.js patch releases. The STRUCTURAL parity
being asserted is the `dk-code-line` wrapper layer, not the inner tokenization.

**Normalization rule**: The `normalizeCodeEl()` function does NOT recurse into
child spans inside `<code>`. Instead, for each `dk-code-line` span it produces a
single `{ text: lineEl.textContent.trim() }` child. The `dk-code-line` wrapper
attributes (`class`, `data-line`, `data-highlighted`, `aria-label`) ARE asserted
— only the inner hljs token spans are replaced by their plain text equivalent.

---

## (d) Entrance animation classes — DEFERRED to v2

**What**: The DeckLee v2 roadmap includes entrance animation CSS classes such as
`rise`, `ar` (animate-right), `al` (animate-left), `af` (animate-fade),
`as` (animate-scale), `ag` (animate-grow).

**Why deferred**: The Astro design-system primitives in v1 do NOT emit these
classes. The viewer twin does NOT emit them either. No normalization is needed
for v1 — this exception documents the future divergence so the parity test is
updated when v2 animations land.

**Normalization rule**: None required for v1. When v2 ships, add entrance classes
to the strip list in `normalize()` and remove this exception entry.

---

## Summary table

| ID  | Exception                           | Normalization strategy        | Scope         |
|-----|-------------------------------------|-------------------------------|---------------|
| (a) | `data-astro-*` attributes           | Strip from attrs              | All layouts   |
| (b) | Whitespace-only text nodes          | Skip from children            | All layouts   |
| (c) | hljs token spans inside `<code>`    | Text-only per dk-code-line    | Code layout   |
| (d) | Entrance animation classes          | Deferred — none in v1         | All (future)  |
