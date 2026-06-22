# DeckLee Workspace

This folder was scaffolded by `decklee init`. It contains everything you need to
author validated presentation decks as JSON.

## Layout

- `deck.json` — a starter deck. Edit it, then render it.
- `examples/` — validated reference decks and an outline you can copy from.
- `prompts/` — the interview + montage text prompts to run inside your AI assistant.
- `skill/` — the DeckLee contract to give your assistant (`AGENTS.md`, or `SKILL.md` for Claude).

## Quick start

```sh
decklee build deck.json          # render deck.json → deck.html
decklee build examples/deck-example-1.json
decklee validate deck.json       # check a deck without rendering
decklee theme list               # list available themes
```

## Working with an AI assistant

1. Give your assistant the contract in `skill/AGENTS.md` (Claude users: upload
   `skill/SKILL.md` to a Project).
2. Run the `prompts/interview.md` flow to build an Outline.
3. Run `prompts/montage.md` to turn the frozen Outline into a Deck.
4. Save the Deck JSON and `decklee build` it.
