/**
 * Code highlighting — pure, synchronous, DOM-free (NFR-02).
 *
 * Uses the highlight.js core build with an explicit 12-language subset
 * (NFR-01, ≤50kB) so we never pull the full grammar bundle. `highlight()`
 * tokenizes code to hljs HTML; `wrapLines()` splits that HTML into one
 * <span class="dk-code-line"> per visible line, correctly reopening/closing
 * hljs spans that straddle line boundaries (AC-03, FR-04).
 */
import hljs from "highlight.js/lib/core";

import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import sql from "highlight.js/lib/languages/sql";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import dockerfile from "highlight.js/lib/languages/dockerfile";

/** The closed set of languages DeckLee ships grammars for (NFR-01). */
export const SUPPORTED_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "bash",
  "json",
  "yaml",
  "css",
  "html",
  "sql",
  "go",
  "rust",
  "dockerfile",
] as const;

// highlight.js ships HTML under the grammar id "xml"; "html" is an alias.
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("dockerfile", dockerfile);

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Tokenize `code` to highlight.js HTML. Unknown languages fall back to plain
 * text — never throws (FR-05). No line wrapping happens here.
 */
export function highlight(code: string, language: string): string {
  const isSupported =
    (SUPPORTED_LANGUAGES as readonly string[]).includes(language) &&
    hljs.getLanguage(language) !== undefined;

  if (!isSupported) {
    return escapeHtml(code);
  }

  return hljs.highlight(code, { language }).value;
}

const OPEN_TAG = /^<span[^>]*>/;
const CLOSE_TAG = /^<\/span>/;

interface LineWrapAttrs {
  highlighted: boolean;
}

function wrapLine(inner: string, lineNo: number, attrs: LineWrapAttrs): string {
  const marker = attrs.highlighted
    ? ' data-highlighted aria-label="highlighted"'
    : "";
  return `<span class="dk-code-line" data-line="${lineNo}"${marker}>${inner}</span>`;
}

/**
 * Split hljs HTML into one dk-code-line span per visible line.
 *
 * Walks the HTML as a stream of OPEN_TAG / CLOSE_TAG / TEXT / NEWLINE chunks,
 * tracking the stack of currently-open <span> opening strings. At each newline
 * it closes every open span to keep the emitted line balanced, wraps the line,
 * then re-opens those same spans so a grammar span straddling the boundary
 * continues unbroken on the next line. Highlighted lines carry a non-color
 * marker (data-highlighted + aria-label).
 */
export function wrapLines(html: string, highlightLines: number[]): string {
  const openTags: string[] = [];
  const lines: string[] = [];
  let buffer = "";
  let lineNo = 1;

  const flushLine = (): void => {
    // Close still-open spans so the line's HTML is self-balanced.
    const closed = buffer + "</span>".repeat(openTags.length);
    lines.push(
      wrapLine(closed, lineNo, { highlighted: highlightLines.includes(lineNo) }),
    );
    lineNo += 1;
    // Re-open the same spans so the grammar span continues on the next line.
    buffer = openTags.join("");
  };

  let i = 0;
  while (i < html.length) {
    const rest = html.slice(i);

    const openMatch = rest.match(OPEN_TAG);
    if (openMatch) {
      const tag = openMatch[0];
      buffer += tag;
      openTags.push(tag);
      i += tag.length;
      continue;
    }

    const closeMatch = rest.match(CLOSE_TAG);
    if (closeMatch) {
      const tag = closeMatch[0];
      buffer += tag;
      openTags.pop();
      i += tag.length;
      continue;
    }

    const char = html[i];
    if (char === "\n") {
      flushLine();
      i += 1;
      continue;
    }

    buffer += char;
    i += 1;
  }

  // Flush the trailing line only when it carries content beyond the re-opened
  // spans — a trailing "\n" must not produce an empty extra line.
  if (buffer !== openTags.join("")) {
    flushLine();
  }

  return lines.join("\n");
}
