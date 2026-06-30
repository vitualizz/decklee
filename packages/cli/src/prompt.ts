/**
 * The interactive-input seam for the CLI. `Prompter` is a tiny interface so
 * commands can be unit-tested with a scripted fake instead of a live TTY.
 *
 * createReadlinePrompter() is the ONLY place node:readline/promises is ever
 * instantiated — keep it that way so tests never touch real stdin and a
 * non-TTY run can simply never construct one (and therefore never hang).
 */
import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";

export interface Prompter {
  /**
   * Ask a free-text question. Blank input falls back to `opts.default` when
   * given; with `required` and no default, it re-prompts until non-empty.
   */
  line(question: string, opts?: { default?: string; required?: boolean }): Promise<string>;
  /**
   * Render a NUMBERED menu (1..n) of `choices` and return the chosen slug.
   * Re-prompts on out-of-range / non-numeric input. Supports a default index.
   */
  choice(
    question: string,
    choices: { slug: string; label: string }[],
    opts?: { default?: number },
  ): Promise<string>;
  close(): void;
}

export function createReadlinePrompter(input?: Readable, output?: Writable): Prompter {
  const rl = createInterface({
    input: input ?? process.stdin,
    output: output ?? process.stdout,
  });

  async function line(
    question: string,
    opts?: { default?: string; required?: boolean },
  ): Promise<string> {
    const suffix = opts?.default !== undefined ? ` [${opts.default}]` : "";
    for (;;) {
      const answer = (await rl.question(`${question}${suffix} `)).trim();
      if (answer.length > 0) return answer;
      if (opts?.default !== undefined) return opts.default;
      if (opts?.required) continue; // re-prompt: required and no default
      return "";
    }
  }

  async function choice(
    question: string,
    choices: { slug: string; label: string }[],
    opts?: { default?: number },
  ): Promise<string> {
    const menu = choices.map((c, i) => `  ${i + 1}. ${c.label}`).join("\n");
    const defIdx = opts?.default;
    const defSuffix = defIdx !== undefined ? ` [${defIdx + 1}]` : "";
    for (;;) {
      const answer = (await rl.question(`${question}\n${menu}\n> (1-${choices.length})${defSuffix} `)).trim();
      if (answer.length === 0 && defIdx !== undefined) {
        return choices[defIdx]!.slug;
      }
      const n = Number(answer);
      if (Number.isInteger(n) && n >= 1 && n <= choices.length) {
        return choices[n - 1]!.slug;
      }
      // out-of-range or non-numeric → loop and re-prompt
    }
  }

  return {
    line,
    choice,
    close: () => rl.close(),
  };
}
