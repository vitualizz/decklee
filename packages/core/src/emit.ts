/**
 * emitDeck — the one-call convenience wrapper: resolve a template (caller-
 * supplied string, caller-supplied path, or a fresh assemble) then inject the
 * deck. Prefer passing a prebuilt template to skip the esbuild bundle.
 */
import { readFileSync } from "node:fs";

import type { AssembleOpts } from "./assemble.js";
import { injectDeck } from "./inject.js";

export type EmitOpts = AssembleOpts & {
  /** Use this template HTML as-is. Wins over templatePath and fresh assembly. */
  templateHtml?: string;
  /** Read template HTML from this path. Wins over fresh assembly. */
  templatePath?: string;
};

/**
 * Assemble (or reuse) a template and inject `deck` into it. Errors from
 * assembleTemplate() and injectDeck() propagate unchanged.
 */
export async function emitDeck(deck: unknown, opts?: EmitOpts): Promise<string> {
  let html: string;
  if (opts?.templateHtml != null) {
    html = opts.templateHtml;
  } else if (opts?.templatePath != null) {
    html = readFileSync(opts.templatePath, "utf-8");
  } else {
    const { assembleTemplate } = await import("./assemble.js");
    html = await assembleTemplate(opts);
  }
  return injectDeck(html, deck);
}
