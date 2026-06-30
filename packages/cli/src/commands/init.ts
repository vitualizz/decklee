/**
 * `decklee init <name> [flags]` — scaffold a DeckLee workspace AND capture the
 * deck's intent (title / audience / tone / narrative arc / theme) up front.
 *
 * On a TTY it runs a short plain-language questionnaire; non-interactively it
 * reads the same answers from flags. It copies the bundled static snapshot,
 * mints a draft `outline.json` pre-filled with the intent, and patches the
 * starter `deck.json` meta to point at it. NO generator and NO LLM call run at
 * init time — it stays offline and fast.
 */
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getRegisteredThemes } from "@decklee/design-system";
import { safeValidateOutline } from "@decklee/schema";
import { createReadlinePrompter, type Prompter } from "../prompt.js";

const EXIT_OK = 0;
const EXIT_USER = 1;
const EXIT_IO = 2;

type ErrorCode = "USER_ERROR" | "IO_ERROR";

/** Carries the intended exit code + envelope code alongside a friendly message. */
class CliError extends Error {
  constructor(
    readonly exitCode: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CliError";
  }
}

function printErrorEnvelope(code: ErrorCode, message: string): void {
  process.stderr.write(`${JSON.stringify({ error: { code, message } })}\n`);
}

/**
 * Plain-language narrative-arc menu. Index → slug → label. The slug ORDER must
 * mirror NarrativeArcSchema in @decklee/schema so menu position 1..5 maps to the
 * canonical arcs.
 */
const NARRATIVE_ARC_MENU: { slug: string; label: string }[] = [
  { slug: "problem-solution", label: "Problem → Solution (set up a pain, then resolve it)" },
  { slug: "chronological", label: "Chronological (walk through time / steps in order)" },
  { slug: "thesis-support", label: "Thesis + Support (state a claim, then back it up)" },
  { slug: "story", label: "Story (a narrative with characters and an arc)" },
  { slug: "comparison", label: "Comparison (weigh options side by side)" },
];
const NARRATIVE_ARC_SLUGS = NARRATIVE_ARC_MENU.map((m) => m.slug);

const DEFAULT_THEME = "dev";

export interface InitOptions {
  name?: string;
  dir?: string;
  title?: string;
  audience?: string;
  tone?: string;
  narrativeArc?: string;
  theme?: string;
  force?: boolean;
}

export interface InitDeps {
  prompter?: Prompter;
  isTTY?: boolean;
  cwd?: string;
}

interface Intent {
  title: string;
  audience: string;
  tone: string;
  narrative_arc: string;
  theme: string;
}

/** positional name > --dir > (TTY) prompt > (non-TTY) hard error. */
async function resolveTargetName(
  opts: InitOptions,
  isTTY: boolean,
  prompter: Prompter | undefined,
): Promise<string> {
  const fromFlag = (opts.name ?? opts.dir)?.trim();
  if (fromFlag) return fromFlag;
  if (isTTY && prompter) {
    return prompter.line("What should we name your deck folder?", { required: true });
  }
  throw new CliError(
    EXIT_USER,
    "USER_ERROR",
    "Missing deck folder name. Pass it as `decklee init <name>` or `--dir <path>`.",
  );
}

/** "my-cool-deck" / "my_cool_deck" → "My Cool Deck". */
function deriveTitle(name: string): string {
  return basename(name)
    .split(/[-_]/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** TTY: run the questionnaire. Non-TTY: read from flags, requiring the core three. */
async function collectIntent(
  opts: InitOptions,
  name: string,
  isTTY: boolean,
  prompter: Prompter | undefined,
): Promise<Intent> {
  const defaultTitle = deriveTitle(name);

  if (isTTY && prompter) {
    const title = await prompter.line("Deck title?", { default: opts.title ?? defaultTitle });
    const audience = await prompter.line("Who is this deck for? (the audience)", { required: true });
    const tone = await prompter.line(
      "What tone should it strike? (e.g. confident, playful, calm)",
      { required: true },
    );
    const narrative_arc = await prompter.choice("How should the story flow?", NARRATIVE_ARC_MENU, {
      default: 0,
    });
    const theme = await prompter.line("Which look (theme) should it wear?", {
      default: opts.theme ?? DEFAULT_THEME,
    });
    return { title, audience, tone, narrative_arc, theme };
  }

  const missing: string[] = [];
  if (!opts.audience) missing.push("--audience");
  if (!opts.tone) missing.push("--tone");
  if (!opts.narrativeArc) missing.push("--narrative-arc");
  if (missing.length > 0) {
    throw new CliError(
      EXIT_USER,
      "USER_ERROR",
      `Non-interactive init needs these flags: ${missing.join(", ")}.`,
    );
  }
  return {
    title: opts.title ?? defaultTitle,
    audience: opts.audience as string,
    tone: opts.tone as string,
    narrative_arc: opts.narrativeArc as string,
    theme: opts.theme ?? DEFAULT_THEME,
  };
}

/** Reject an unknown theme or a narrative arc outside the canonical five. */
function validateInputs(intent: Intent): void {
  const themes = getRegisteredThemes();
  if (!themes.includes(intent.theme)) {
    throw new CliError(
      EXIT_USER,
      "USER_ERROR",
      `Unknown theme "${intent.theme}". Available themes: ${themes.join(", ")}.`,
    );
  }
  if (!NARRATIVE_ARC_SLUGS.includes(intent.narrative_arc)) {
    throw new CliError(
      EXIT_USER,
      "USER_ERROR",
      `Unknown narrative arc "${intent.narrative_arc}". Choose one of: ${NARRATIVE_ARC_SLUGS.join(", ")}.`,
    );
  }
}

/** Refuse to clobber a non-empty existing target unless --force was passed. */
function ensureTargetWritable(target: string, force: boolean): void {
  if (existsSync(target) && readdirSync(target).length > 0 && !force) {
    throw new CliError(
      EXIT_USER,
      "USER_ERROR",
      `Target ${target} already exists and is not empty. Re-run with --force to overwrite.`,
    );
  }
}

function scaffold(target: string): void {
  const source = fileURLToPath(new URL("../../templates/init-scaffold", import.meta.url));
  cpSync(source, target, { recursive: true });
}

function buildOutline(intent: Intent, id: string): unknown {
  return {
    schema_version: "1",
    kind: "outline",
    id,
    meta: {
      title: intent.title,
      audience: intent.audience,
      tone: intent.tone,
      narrative_arc: intent.narrative_arc,
      knowledge_base: [],
    },
    approval: { status: "draft", approved_at: null },
    sections: [],
  };
}

/** Self-check the minted outline against the schema BEFORE writing it. */
function writeOutline(target: string, outline: unknown): void {
  const result = safeValidateOutline(outline);
  if (!result.ok) {
    throw new CliError(
      EXIT_IO,
      "IO_ERROR",
      "Internal error: the generated outline failed its own schema self-check.",
    );
  }
  writeFileSync(join(target, "outline.json"), `${JSON.stringify(outline, null, 2)}\n`, "utf-8");
}

/** Patch ONLY meta.title / meta.theme_id / meta.source_outline_id (deck meta is strict). */
function patchDeckMeta(
  target: string,
  title: string,
  themeId: string,
  sourceOutlineId: string,
): void {
  const deckPath = join(target, "deck.json");
  const deck = JSON.parse(readFileSync(deckPath, "utf-8")) as {
    meta: { title: string; theme_id: string; source_outline_id: string | null };
    [key: string]: unknown;
  };
  deck.meta.title = title;
  deck.meta.theme_id = themeId;
  deck.meta.source_outline_id = sourceOutlineId;
  writeFileSync(deckPath, `${JSON.stringify(deck, null, 2)}\n`, "utf-8");
}

function printSummary(target: string, intent: Intent): void {
  process.stdout.write(
    `Created your DeckLee workspace in ${target} (theme: ${intent.theme})\n` +
      `Next steps:\n` +
      `  1. cd into ${basename(target)}\n` +
      `  2. Drop your documents and images into the folder\n` +
      `  3. Open the folder in your AI assistant and ask it to build your deck\n` +
      `     (it reads outline.json and skips the questions you already answered)\n` +
      `  4. decklee build deck.json\n`,
  );
}

export async function runInit(opts: InitOptions, deps?: InitDeps): Promise<number> {
  // Decide TTY-ness ONCE. When NOT a TTY we never construct a readline prompter,
  // so a non-interactive run can never block waiting on stdin.
  const isTTY = deps?.isTTY ?? process.stdin.isTTY === true;
  const cwd = deps?.cwd ?? process.cwd();

  let prompter = deps?.prompter;
  let ownsPrompter = false;
  if (isTTY && !prompter) {
    prompter = createReadlinePrompter();
    ownsPrompter = true;
  }

  try {
    const name = await resolveTargetName(opts, isTTY, prompter);
    const intent = await collectIntent(opts, name, isTTY, prompter);
    validateInputs(intent);

    const target = resolve(cwd, name);
    ensureTargetWritable(target, opts.force === true);
    scaffold(target);

    const outlineId = `outline-${randomUUID()}`;
    writeOutline(target, buildOutline(intent, outlineId));
    patchDeckMeta(target, intent.title, intent.theme, outlineId);

    printSummary(target, intent);
    return EXIT_OK;
  } catch (caught) {
    if (caught instanceof CliError) {
      printErrorEnvelope(caught.code, caught.message);
      return caught.exitCode;
    }
    printErrorEnvelope("IO_ERROR", (caught as Error).message);
    return EXIT_IO;
  } finally {
    if (ownsPrompter && prompter) prompter.close();
  }
}
