# DeckLee Interview Prompt — build the Outline

> This is a TEXT ASSET you run inside YOUR assistant. DeckLee itself makes NO
> LLM calls — it never talks to a model. You drive the conversation; DeckLee
> only validates and renders the JSON you produce.

## If `./outline.json` already exists (from `decklee init`)

`decklee init` writes a pre-filled `./outline.json` that already captures the
**Goal/title**, **Audience**, **Tone**, and **Narrative Arc**. If that file is
present, READ it first and SKIP the phases it already answers — do NOT re-ask
Phase 1 (GOAL), Phase 2 (AUDIENCE), Phase 3 (TONE), or Phase 4 (NARRATIVE ARC).
Confirm them in one line if useful, then go straight to Phase 5 (KNOWLEDGE BASE)
and the drafting sections below, carrying the pre-filled `meta` through unchanged.

You are interviewing the user to co-author a presentation **Outline** (pure
narrative — no layout, no theme, no styling). Work through five phases, then
draft an Outline JSON, then iterate section-by-section until every section is
accepted, then freeze.

## Phase 1 — GOAL
What is the single outcome this deck must achieve? What should the audience do,
believe, or feel afterward?

## Phase 2 — AUDIENCE
Who is in the room? Their expertise, their stakes, what they already know.

## Phase 3 — TONE
How should it feel — authoritative, playful, urgent, calm? One or two words.

## Phase 4 — NARRATIVE ARC
Pick one: `problem-solution`, `chronological`, `thesis-support`, `story`,
`comparison`. This drives the order of sections and beats.

## Phase 5 — KNOWLEDGE BASE
What sources, facts, data, or quotes can back the claims? Capture each as a
short string. Mark each beat later with `kb_backed: true/false`.

## Draft the Outline JSON

Produce an Outline document of this shape:

```json
{
  "schema_version": "1",
  "kind": "outline",
  "id": "outline-001",
  "meta": {
    "title": "string",
    "audience": "string",
    "tone": "string",
    "narrative_arc": "problem-solution",
    "knowledge_base": ["string"]
  },
  "approval": { "status": "draft", "approved_at": null },
  "sections": [
    {
      "id": "sec-1",
      "title": "string",
      "accepted": false,
      "beats": [
        {
          "id": "beat-1",
          "point": "the claim being made",
          "support": "evidence or null",
          "slide_hint": "free-text hint, NOT a layout name",
          "kb_backed": true
        }
      ]
    }
  ]
}
```

Notes:
- `slide_hint` is **free text** — never a layout enum value. Layout choice
  happens later, in the montage step.
- Outline JSON must NEVER contain `layout`, `content_props`, `theme`,
  `theme_id`, or any styling key (narrative purity — HC-03).

## ITERATIVE per-section approval

Present sections one at a time. For each:

- If the user says **ACCEPT** → set that section's `accepted: true`.
- If the user requests **CHANGES** → rewrite the section, re-present it, and keep
  `accepted: false` until they accept.

## EXIT CONDITION — freeze

When **all** `sections[].accepted === true`:

1. Set `approval.status` to `"frozen"`.
2. Set `approval.approved_at` to the current ISO timestamp.
3. The outline is now frozen — hand it off to the **montage** prompt.

A frozen outline with any unaccepted section is invalid and will be rejected.

> Validate any draft with `decklee validate outline.json --kind outline`.
