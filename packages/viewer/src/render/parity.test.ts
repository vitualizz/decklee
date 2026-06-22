/**
 * T-015 — Parity gate (R-NEW-01): structural DOM equivalence between the viewer
 * twin and the committed design-system Astro snapshots.
 *
 * THIS IS THE RELEASE GATE. All 8 fixtures MUST pass before @decklee/core
 * integration. A failure here means the twin's DOM diverges from what Astro
 * renders — the #1 project risk materializing.
 *
 * Documented exceptions are in packages/viewer/tests/parity-exceptions.md.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

import { renderHero } from "./hero.js";
import { renderTwoUp } from "./two-up.js";
import { renderCode } from "./code.js";
import { renderQuote } from "./quote.js";

import {
  heroCanonical,
  heroImage,
  twoUpTextOnly,
  twoUpHeadings,
  codeCanonical,
  codeMinimal,
  quoteCanonical,
  quoteRuled,
} from "./parity-fixtures.js";

// ---------------------------------------------------------------------------
// Resolve snapshot file paths relative to this file (works in NodeNext ESM)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SNAP_ROOT = resolve(
  __dirname,
  "../../../design-system/src/primitives/__snapshots__",
);

function readSnap(filename: string): string {
  return readFileSync(resolve(SNAP_ROOT, filename), "utf-8");
}

// ---------------------------------------------------------------------------
// Snapshot parser — extracts the HTML value from a vitest .snap file
// ---------------------------------------------------------------------------

/**
 * Parse a vitest snapshot file and return a map of export key → unescaped HTML.
 *
 * Vitest snapshot format:
 *   exports[`key`] = `"<html ...>"`;          (single-line)
 *   exports[`key`] = `\n"<html ...>"\n`;      (multi-line — Code snapshots)
 *
 * The value is the JS template-literal body; vitest stores the HTML as a
 * JSON-encoded string INSIDE the template literal, so we:
 *  1. Extract the raw template body between the outer backticks.
 *  2. Trim leading/trailing whitespace (multi-line snapshots have \n padding).
 *  3. Strip the surrounding double-quotes that vitest adds (JSON string wrapper).
 *  4. Unescape JSON string escape sequences (\n → newline, \" → ").
 */
function parseSnapFile(content: string): Map<string, string> {
  const result = new Map<string, string>();

  // Match: exports[`key`] = `...body...`;
  // The body may span multiple lines (Code snapshots).
  const pattern = /exports\[`([^`]+)`\]\s*=\s*`([\s\S]*?)`;/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const key = match[1];
    const rawBody = match[2];

    // rawBody is the template-literal body. Trim leading/trailing whitespace
    // (multi-line Code snapshot has a leading and trailing newline).
    const trimmed = rawBody.trim();

    // The body is a JSON-encoded string (has surrounding double-quotes).
    // Use JSON.parse to unescape \n, \", \\, etc.
    let html: string;
    try {
      html = JSON.parse(trimmed) as string;
    } catch {
      // Fallback: strip surrounding quotes and do manual unescaping
      const inner = trimmed.replace(/^"|"$/g, "");
      html = inner.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }

    result.set(key, html);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Normalization types and algorithm
// ---------------------------------------------------------------------------

interface NormalNode {
  tag: string;
  attrs: Record<string, string>;
  children: (NormalNode | { text: string })[];
}

/**
 * Normalize an Element into a tag + sorted attrs + children tree.
 *
 * Rules (from dev-design parity_test_algorithm):
 * - tag = tagName.toLowerCase()
 * - attrs = all attributes EXCEPT those starting with "data-astro-"
 *   class attr value = sorted token set (order-insensitive)
 * - children = childNodes, skipping whitespace-only text nodes;
 *   element nodes → recurse; non-empty text nodes → { text: trimmedContent }
 *
 * Code EXCEPTION: for a <code> element, do NOT recurse into inner hljs token
 * spans. Instead produce children as the dk-code-line wrappers (asserting their
 * data-line / data-highlighted / aria-label attrs) but each line's inner content
 * is replaced with a plain { text } node holding the trimmed text content.
 * This lets us assert structural line wrapping without coupling to hljs grammar
 * version differences in token spans.
 */
function normalize(el: Element): NormalNode {
  const tag = el.tagName.toLowerCase();

  const attrs: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("data-astro-")) continue;
    if (attr.name === "class") {
      attrs["class"] = attr.value.trim().split(/\s+/).sort().join(" ");
    } else {
      attrs[attr.name] = attr.value;
    }
  }

  // Code EXCEPTION — normalize line wrappers but not inner hljs spans.
  if (tag === "code") {
    return normalizeCodeEl(el, attrs);
  }

  const children: (NormalNode | { text: string })[] = [];
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() ?? "";
      if (text !== "") {
        children.push({ text });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      children.push(normalize(node as Element));
    }
    // Skip comment nodes, etc.
  }

  return { tag, attrs, children };
}

/**
 * Specialized normalizer for <code> elements.
 *
 * Produces one child per dk-code-line span. Each line child carries its
 * structural attrs (data-line, data-highlighted, aria-label) but its inner
 * content is a single text node = the trimmed text content of that line
 * (stripping hljs token spans entirely for comparison).
 */
function normalizeCodeEl(
  codeEl: Element,
  attrs: Record<string, string>,
): NormalNode {
  const lineChildren: (NormalNode | { text: string })[] = [];

  // The <code> inner HTML may be set via innerHTML, so query child nodes
  // for dk-code-line spans. We iterate childNodes to handle both Element
  // and Text (whitespace) children.
  for (const node of Array.from(codeEl.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Whitespace-only text nodes between lines — skip
      const text = node.textContent?.trim() ?? "";
      if (text !== "") {
        lineChildren.push({ text });
      }
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const lineEl = node as Element;
    if (!lineEl.classList.contains("dk-code-line")) continue;

    // Collect line-wrapper attrs (strip data-astro-* just in case)
    const lineAttrs: Record<string, string> = {};
    for (const attr of Array.from(lineEl.attributes)) {
      if (attr.name.startsWith("data-astro-")) continue;
      if (attr.name === "class") {
        lineAttrs["class"] = attr.value.trim().split(/\s+/).sort().join(" ");
      } else {
        lineAttrs[attr.name] = attr.value;
      }
    }

    // Inner content = trimmed text content (no hljs spans)
    const innerText = lineEl.textContent?.trim() ?? "";
    const lineNode: NormalNode = {
      tag: "span",
      attrs: lineAttrs,
      children: innerText !== "" ? [{ text: innerText }] : [],
    };
    lineChildren.push(lineNode);
  }

  return { tag: "code", attrs, children: lineChildren };
}

// ---------------------------------------------------------------------------
// Helper: parse an HTML fragment with jsdom and return the root element
// ---------------------------------------------------------------------------

function parseFragment(html: string): Element {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const first = template.content.firstElementChild;
  if (!first) throw new Error(`parseFragment: no element found in: ${html.slice(0, 100)}`);
  return first;
}

// ---------------------------------------------------------------------------
// Parity gate tests (R-NEW-01) — 8 fixtures
// ---------------------------------------------------------------------------

describe("Parity gate (R-NEW-01) — Hero", () => {
  const snaps = parseSnapFile(readSnap("Hero.test.ts.snap"));

  it("heroCanonical — twin matches Astro snapshot", () => {
    const snapHtml = snaps.get("Hero — snapshot > canonical render matches snapshot 1");
    expect(snapHtml, "snapshot key not found").toBeDefined();

    const twinEl = renderHero(heroCanonical);
    const snapEl = parseFragment(snapHtml!);

    expect(normalize(twinEl)).toEqual(normalize(snapEl));
  });

  it("heroImage — twin matches Astro snapshot", () => {
    const snapHtml = snaps.get("Hero — snapshot > image background variant matches snapshot 1");
    expect(snapHtml, "snapshot key not found").toBeDefined();

    const twinEl = renderHero(heroImage);
    const snapEl = parseFragment(snapHtml!);

    expect(normalize(twinEl)).toEqual(normalize(snapEl));
  });
});

describe("Parity gate (R-NEW-01) — TwoUp", () => {
  const snaps = parseSnapFile(readSnap("TwoUp.test.ts.snap"));

  it("twoUpTextOnly — twin matches Astro snapshot", () => {
    const snapHtml = snaps.get("TwoUp — snapshot > canonical text-only render matches snapshot 1");
    expect(snapHtml, "snapshot key not found").toBeDefined();

    const twinEl = renderTwoUp(twoUpTextOnly);
    const snapEl = parseFragment(snapHtml!);

    expect(normalize(twinEl)).toEqual(normalize(snapEl));
  });

  it("twoUpHeadings — twin matches Astro snapshot", () => {
    const snapHtml = snaps.get(
      "TwoUp — snapshot > with headings and divider=false matches snapshot 1",
    );
    expect(snapHtml, "snapshot key not found").toBeDefined();

    const twinEl = renderTwoUp(twoUpHeadings);
    const snapEl = parseFragment(snapHtml!);

    expect(normalize(twinEl)).toEqual(normalize(snapEl));
  });
});

describe("Parity gate (R-NEW-01) — Code", () => {
  const snaps = parseSnapFile(readSnap("Code.test.ts.snap"));

  it("codeCanonical — twin matches Astro snapshot", () => {
    const snapHtml = snaps.get("Code — snapshot > canonical render matches snapshot 1");
    expect(snapHtml, "snapshot key not found").toBeDefined();

    const twinEl = renderCode(codeCanonical);
    const snapEl = parseFragment(snapHtml!);

    expect(normalize(twinEl)).toEqual(normalize(snapEl));
  });

  it("codeMinimal — twin matches Astro snapshot", () => {
    const snapHtml = snaps.get(
      "Code — snapshot > minimal render (no heading, no caption, no highlight) matches snapshot 1",
    );
    expect(snapHtml, "snapshot key not found").toBeDefined();

    const twinEl = renderCode(codeMinimal);
    const snapEl = parseFragment(snapHtml!);

    expect(normalize(twinEl)).toEqual(normalize(snapEl));
  });
});

describe("Parity gate (R-NEW-01) — Quote", () => {
  const snaps = parseSnapFile(readSnap("Quote.test.ts.snap"));

  it("quoteCanonical — twin matches Astro snapshot", () => {
    const snapHtml = snaps.get(
      "Quote — snapshot > canonical render with attribution + context matches snapshot 1",
    );
    expect(snapHtml, "snapshot key not found").toBeDefined();

    const twinEl = renderQuote(quoteCanonical);
    const snapEl = parseFragment(snapHtml!);

    expect(normalize(twinEl)).toEqual(normalize(snapEl));
  });

  it("quoteRuled — twin matches Astro snapshot", () => {
    const snapHtml = snaps.get("Quote — snapshot > ruled emphasis no figcaption matches snapshot 1");
    expect(snapHtml, "snapshot key not found").toBeDefined();

    const twinEl = renderQuote(quoteRuled);
    const snapEl = parseFragment(snapHtml!);

    expect(normalize(twinEl)).toEqual(normalize(snapEl));
  });
});
