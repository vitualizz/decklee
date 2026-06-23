# DeckLee Compose Flow — author a deck from a folder of files

> This is a TEXT ASSET you run inside YOUR assistant. DeckLee makes NO LLM calls
> — it never talks to a model. You drive the conversation and produce the JSON;
> DeckLee only validates and renders it.

This document is the end-to-end authoring flow: the user drops their material in
this project folder, and you (the assistant) compose a validated Deck JSON from
it. The two modes — **Guided** (default) and **Quick** — share the exact same
substrate pipeline; they differ only in how much you collaborate before emitting.

---

## (a) Flat-folder type inference

Look at every file the user dropped in the project folder. There are no required
subfolders — the layout is flat. Classify each file by extension:

- **Knowledge** (sources to ground the deck): `.md`, `.txt`, `.doc`, `.docx`,
  `.pdf`
- **Assets** (images the deck can show): `.png`, `.jpg`, `.jpeg`, `.webp`,
  `.gif`, `.svg`
- **Unrecognized** (anything else): note it to the user — "I'm not sure what to
  do with `notes.xlsx`, I'll leave it aside." NEVER abort the whole flow over an
  unrecognized file; just keep going with what you can use.

---

## (b) Interview phase

Run the interview before you compose. See `prompts/interview.md` for the
five-phase script (Goal, Audience, Tone, Narrative Arc, Knowledge Base).

As you go, populate the Outline's `meta.knowledge_base[]` with the inferred
knowledge-file paths from step (a) — each source becomes a short string entry.
This is what lets you mark beats as grounded later.

---

## (c) Guided mode (default)

Outline first, deck second. This is the default unless the user explicitly asks
for Quick mode.

1. Build an **Outline** draft (`approval.status: "draft"`).
2. Present it **section by section** and wait for approval on each — this is the
   approval gate. A section stays `accepted: false` until the user says ACCEPT.
3. When every section is accepted, **freeze**: set `approval.status: "frozen"`
   and `approval.approved_at` to the current ISO timestamp.
4. For each beat, set `kb_backed`: `true` when the beat is grounded in a
   `knowledge_base[]` entry, `false` when it is inferred / your own phrasing.
5. Turn the frozen outline into a Deck JSON via `prompts/montage.md`.

Do not skip the gate in Guided mode — the user leads, you execute.

---

## (d) Quick mode

Only when the user gives an explicit signal — "quick mode", "skip outline", or a
recognized `--quick` token. Quick mode goes straight to a Deck JSON with sensible
defaults, skipping the outline draft and the per-section approval gate.

Quick is a shortcut in collaboration, NOT in correctness: HC-03 (below) and the
local-image rule are enforced exactly the same way as in Guided mode.

---

## (e) Empty or unsupported folder

- **No knowledge AND no images**: stop and ask the user what they want to present
  — what's the topic, where's the material. Do not invent a deck from nothing.
- **Only unsupported file types**: list the files you found, explain which types
  DeckLee expects (knowledge: `.md/.txt/.doc/.docx/.pdf`; images:
  `.png/.jpg/.jpeg/.webp/.gif/.svg`), and ask the user to add usable material.
- **Never** silently emit an empty or near-empty deck. Silence here is a bug, not
  a result.

---

## (f) HC-03 reminder

You emit ONLY validated Deck JSON. NEVER write CSS, HTML, inline styles,
`<style>` blocks, color values, or markup anywhere. The keys `style`, `css`,
`class`, `className`, and `token` are banned anywhere in `content_props` —
styling is the theme's job (`meta.theme_id`).

All `*_image_src` values (`image_src`, `left_image_src`, `right_image_src`) MUST
be **local file paths** relative to `deck.json`. The build converts them to
self-contained `data:` URIs for you — you never inline images by hand and you
never put a `data:` URI or a remote URL in the JSON yourself.

---

## (g) Agentic-only caveat + where to drop files

This flow requires an assistant with **file tools** — Claude Code, Cursor, or a
similar agent that can read the files in this folder. Web chat assistants without
filesystem access are out of scope for the compose flow.

How the user works with you:

- Drop everything **flat** in this project folder, alongside `deck.json`.
- Text files become **knowledge**; image files become **assets** (see (a)).
- Every `*_image_src` field MUST be a **local path** relative to `deck.json`
  (e.g. `./hero.png` or `./assets/diagram.svg`). The build **REJECTS external
  `http(s)` URLs** — DeckLee never fetches remote images. If you put a remote URL
  in an image field, `decklee build` fails with a `VALIDATION_ERROR`.

> Then validate: `decklee validate deck.json` and render: `decklee build deck.json`.
