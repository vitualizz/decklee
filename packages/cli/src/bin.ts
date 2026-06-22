#!/usr/bin/env node
/**
 * decklee CLI entrypoint. Dispatches build|validate|theme|init via node:util
 * parseArgs (zero external runtime deps). Each command returns a numeric exit
 * code; this module is the only place that calls process.exit().
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runBuild } from "./commands/build.js";
import { runValidate } from "./commands/validate.js";
import { runTheme } from "./commands/theme.js";
import { runInit } from "./commands/init.js";

const USAGE = `decklee — build validated presentation decks from JSON

Usage:
  decklee build <deck.json> [--out <file>] [--template <file>]
  decklee validate <file> [--kind deck|outline]
  decklee theme list
  decklee init [--dir <path>]

Options:
  -h, --help     Show this help
  -v, --version  Print the version
`;

function readVersion(): string {
  try {
    const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    strict: false,
    options: {
      template: { type: "string" },
      out: { type: "string" },
      kind: { type: "string" },
      dir: { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });

  if (values.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (values.version) {
    process.stdout.write(`${readVersion()}\n`);
    return 0;
  }

  const command = positionals[0];
  switch (command) {
    case "build": {
      const file = positionals[1];
      if (!file) {
        process.stderr.write("decklee build: missing <deck.json>\n");
        return 1;
      }
      return runBuild(file, {
        template: values.template as string | undefined,
        out: values.out as string | undefined,
      });
    }
    case "validate": {
      const file = positionals[1];
      if (!file) {
        process.stderr.write("decklee validate: missing <file>\n");
        return 1;
      }
      return runValidate(file, { kind: values.kind as string | undefined });
    }
    case "theme":
      return runTheme(positionals[1]);
    case "init":
      return runInit({ dir: values.dir as string | undefined });
    default:
      process.stdout.write(USAGE);
      return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`${JSON.stringify({ error: { code: "IO_ERROR", message: (err as Error).message } })}\n`);
    process.exit(2);
  });
