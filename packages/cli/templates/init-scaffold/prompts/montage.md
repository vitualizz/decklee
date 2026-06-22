# DeckLee Montage Prompt — turn a frozen Outline into a Deck

> This is a TEXT ASSET you run inside YOUR assistant. DeckLee makes NO LLM calls.
> You produce the Deck JSON; DeckLee only validates and renders it.

> **HC-03 RULE (read first):** You emit ONLY validated Deck JSON. NEVER write CSS,
> HTML, inline styles, `<style>` blocks, color values, or markup. The keys
> `style`, `css`, `class`, `className`, `token` are banned anywhere in
> `content_props`. Styling is the theme's job.

## Precondition

The Outline you start from MUST have `approval.status === "frozen"`. If it is
still `"draft"`, stop and return to the interview prompt — do not montage an
unfrozen outline.

## Per-beat layout choice

Walk the frozen outline beat by beat. For each beat, choose ONE layout:

- `hero` — openers, big single statements, section titles, CTAs.
- `two-up` — comparisons, problem/solution, before/after, feature lists.
- `code` — source snippets (the one place a `code` value may carry symbols).
- `quote` — testimonials, citations, memorable lines.

The beat's `slide_hint` is a suggestion, not a binding — pick the layout that
serves the point.

## Fill content_props

Map the beat's `point` / `support` into the chosen layout's `content_props`
fields (see the primitives reference / AGENTS.md for the exact allowed fields
per layout). Use only the documented fields — unknown fields are rejected.

Write `speaker_notes` (string or null) on every slide.

## theme_id — exactly once

Set `theme_id` ONCE, at `deck.meta.theme_id` (e.g. `"dev"`). NEVER put a theme,
color, or styling anywhere else — especially not inside a slide or
`content_props`.

## Emit the Deck JSON

```json
{
  "schema_version": "1",
  "kind": "deck",
  "id": "deck-001",
  "meta": { "title": "string", "theme_id": "dev", "source_outline_id": "outline-001" },
  "slides": [
    {
      "id": "s1",
      "layout": "hero",
      "content_props": { "headline": "string" },
      "speaker_notes": "string or null"
    }
  ]
}
```

## Pre-emit self-check (run all five)

1. `schema_version` is `"1"`, `kind` is `"deck"`.
2. `theme_id` appears ONLY at `meta.theme_id` — nowhere else.
3. Every slide has a valid `layout` and only that layout's allowed
   `content_props` fields.
4. No banned keys (`style`, `css`, `class`, `className`, `token`) and no CSS
   string values anywhere in `content_props`.
5. Every slide has `speaker_notes` (string or null).

> Then validate: `decklee validate deck.json` and render: `decklee build deck.json`.
