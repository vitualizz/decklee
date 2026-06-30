# DeckLee

**Turn your material into a beautiful presentation you can open anywhere — no design or coding needed.**

You bring the content. Your own AI assistant writes the deck. DeckLee checks it and hands you one polished file you can share with anyone. That's the whole deal.

---

## What DeckLee is

Think of DeckLee as the quiet helper that turns your notes, documents, and pictures into a finished, good-looking presentation.

Here's the plain story:

1. You drop your files into a folder — the documents you want to talk about and any images you want to show.
2. Your own AI assistant (the one you already chat with) reads those files and writes the presentation for you. It even asks you a few questions first, like a thoughtful collaborator.
3. DeckLee double-checks everything and assembles it into **one single file** — a web page you can open in any browser.

You never open a design tool. You never write code. You describe what you want, and the deck takes shape.

> The finished file is self-contained: one `.html` page you can open on any computer, offline, with nothing to install. Email it, drop it in a shared drive, present it from a laptop with no internet. It just works.

---

## Is this for you, and what you'll need

**Yes, this is for you** if you want a sharp-looking presentation but you don't write code — teachers, founders, marketers, students, anyone with something to say.

You'll need two things first. Both are gentle, one-time setups:

- **Node** — a small, free program that lets these helper commands run on your computer. Install it once from [nodejs.org](https://nodejs.org) and you're set.
- **An AI assistant that can open your files** — something like Claude Code, Cursor, or a similar tool that can read the folder on your computer. A plain web chat window won't work here, because it can't see your files.

> **You don't need to be comfortable with a terminal.** Your AI assistant can run all of the commands below *for* you. You just say what you want; it does the typing.

---

## Where your content goes (you stay in control)

This matters, so it gets its own spot:

> **DeckLee never calls any AI itself. It never sends your content anywhere.**

Only *your own* assistant ever reads your material. DeckLee's only jobs are to **check** that your deck is set up correctly and to **assemble** the final file. Your words and your images stay with you.

---

## Make your first deck

Here's the happy path, start to finish. Each command has a plain-language note right under it. The simplest way to run them is with `npx`, which fetches and runs DeckLee for you without a separate install.

**1. Set up a fresh folder for your deck**

```bash
npx decklee init my-deck
```
*Creates a new folder called `my-deck`, all set up and ready for your files. (Pick any name you like.) It asks you a few friendly questions first — the title, who it's for, the tone, the structure of the story, and the look — so your deck starts off already pointed in the right direction. Prefer to skip the questions? Pass the answers as flags instead: `--title`, `--audience`, `--tone`, `--narrative-arc`, and `--theme`.*

**2. Drop your files in**

Put your documents and pictures right inside the `my-deck` folder. No special structure — just drop them in. (More on what files work in the next section.)

**3. Ask your assistant to make the deck**

Open the folder in your AI assistant and ask it to build your DeckLee presentation. It'll interview you — your goal, your audience, the tone, the story you want to tell — and then write the deck for you.

**4. Check that everything's in order**

```bash
npx decklee validate deck.json
```
*Looks over your deck and confirms it's set up correctly, without building it yet.*

**5. Build the final page**

```bash
npx decklee build deck.json
```
*Puts it all together into one finished web page. Your images get folded right in.*

**6. Open it**

You'll find a new file called `deck.html` sitting right next to `deck.json`. Double-click it. That's your presentation. 🎉

> Prefer to install once instead of typing `npx` each time? Run `npm install -g decklee` one time, then you can drop the `npx` and just say `decklee init`, `decklee build deck.json`, and so on.

> Starting from a blank folder feels strange, but it's totally normal — add one file and you're already on your way.

---

## What files you can use

Drop everything **flat** into your project folder. DeckLee sorts them out for you, and anything it doesn't recognize is simply set aside — no harm done.

| You add…   | File types                                  | What it becomes                                  |
|------------|---------------------------------------------|--------------------------------------------------|
| Documents  | `.md`, `.txt`, `.doc`, `.docx`, `.pdf`      | The knowledge your deck talks about              |
| Images     | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg` | Pictures your deck can show                  |

> **Use image files saved on your computer**, not links to pictures on the web. If you found an image online, save a copy into your folder first, then it'll show up in your deck.

---

## Two ways to build

There's no wrong choice here — just pick the pace that fits the moment.

| Path                | How it feels                                                        | Pick it when…                       |
|---------------------|--------------------------------------------------------------------|-------------------------------------|
| **Guided** (default)| Your assistant drafts an outline and you approve it section by section. You lead. | You're new, or you want a say in the shape. |
| **Quick**           | Skip the outline and go straight to a finished deck.               | You just want speed.                |

> New here? Take the guided path. In a hurry? Try the quick one. Quick is a shortcut in *collaboration*, never in *quality* — the result is just as polished.

---

## Pick a look

Choose the vibe that fits your story. You don't edit anything by hand — just tell your assistant which look you want, and it sets it for you.

| Look      | The feel                          |
|-----------|-----------------------------------|
| **dev**   | Clean, dark, editorial.           |
| **aurora**| Dark, cosmic, with a soft glow.   |

Want to see them listed out yourself?

```bash
npx decklee theme list
```
*Shows the looks you can choose from.*

---

## Command reference

| Command                      | What it gives you                                                |
|------------------------------|------------------------------------------------------------------|
| `decklee init <name>`        | A fresh project folder for your deck, named however you like. (It asks a few questions, or takes them as flags.) |
| `decklee validate <file>`    | A check that your deck is set up correctly, without building it.  |
| `decklee build <deck.json>`  | The finished web page. (Add `--out <file>` to choose where it's saved.) |
| `decklee theme list`         | The list of available looks.                                     |
| `decklee --help`             | A reminder of what each command does. (Short form: `-h`.)        |
| `decklee --version`          | Which version you're running. (Short form: `-v`.)                |

> By default, `decklee build deck.json` saves your finished page as `deck.html` in the same folder as the input. Use `--out` only if you want it somewhere else.

---

## When something goes wrong

These are normal little bumps, not mistakes on your part. Here's how to smooth each one:

- **It says an image link from the web can't be used** — that picture lives online, and DeckLee only uses files on your computer. Save a copy into your folder and point to that instead.
- **The check (validate) flags something** — no need to decode it yourself. Hand the message to your assistant and ask it to fix the deck for you.
- **You can't find your finished file** — look right next to `deck.json`. Your `deck.html` lives in the same folder, unless you chose a different spot with `--out`.

---

## Go deeper

- **`AGENTS.md`** (in this project) — the instructions you hand to an AI assistant so it knows how to build DeckLee decks.
- **`skill/COMPOSE.md`** — the full step-by-step guide to composing a deck. You'll find it *inside your own project folder* after you run `decklee init`.
- **Want to help improve DeckLee?** Contributions are welcome — explore the `packages/` folder to see how it's built.
- **License:** DeckLee is **MIT licensed** — free to use, change, and share. (The license is declared in the project's package metadata.)
