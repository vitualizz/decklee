/**
 * `decklee init [--dir path]` — scaffold a DeckLee workspace by copying the
 * static bundled snapshot (skill/, examples/, prompts/, starter deck.json,
 * README). NO generator runs at init time — it stays offline and fast.
 */
import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXIT_OK = 0;
const EXIT_IO = 2;

function printErrorEnvelope(message: string): void {
  process.stderr.write(`${JSON.stringify({ error: { code: "IO_ERROR", message } })}\n`);
}

export async function runInit(opts: { dir?: string }): Promise<number> {
  const target = opts.dir ?? process.cwd();
  const source = fileURLToPath(new URL("../../templates/init-scaffold", import.meta.url));

  try {
    cpSync(source, target, { recursive: true });
  } catch (caught) {
    printErrorEnvelope(`Could not scaffold into ${target}: ${(caught as Error).message}`);
    return EXIT_IO;
  }

  process.stdout.write(
    `Scaffolded DeckLee workspace into ${target}\n` +
      `Next steps:\n` +
      `  1. Read README.md\n` +
      `  2. decklee build examples/deck-example-1.json\n` +
      `  3. Give skill/AGENTS.md to your AI assistant\n`,
  );
  return EXIT_OK;
}
