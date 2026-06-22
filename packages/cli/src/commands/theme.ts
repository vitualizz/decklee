/**
 * `decklee theme list` — print the registered theme ids, one per line.
 */
import { getRegisteredThemes } from "@decklee/design-system";

const EXIT_OK = 0;
const EXIT_USER = 1;

function printThemeHelp(): void {
  process.stderr.write("Usage: decklee theme list\n");
}

export function runTheme(sub: string | undefined): number {
  if (sub !== "list") {
    printThemeHelp();
    return EXIT_USER;
  }
  for (const id of getRegisteredThemes()) {
    process.stdout.write(`${id}\n`);
  }
  return EXIT_OK;
}
