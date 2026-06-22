/**
 * Tests for highlight.ts — highlight(), wrapLines(), SUPPORTED_LANGUAGES.
 *
 * Runs in node environment (NFR-02: no DOM). All assertions test observable
 * behaviour, not internal implementation.
 */
import { describe, it, expect } from "vitest";
import { highlight, wrapLines, SUPPORTED_LANGUAGES } from "./highlight.js";

// ---------------------------------------------------------------------------
// SUPPORTED_LANGUAGES
// ---------------------------------------------------------------------------

describe("SUPPORTED_LANGUAGES", () => {
  it("contains exactly 12 entries", () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(12);
  });

  it("contains all expected language identifiers", () => {
    const expected = [
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
    ];
    for (const lang of expected) {
      expect(SUPPORTED_LANGUAGES).toContain(lang);
    }
  });
});

// ---------------------------------------------------------------------------
// highlight()
// ---------------------------------------------------------------------------

describe("highlight()", () => {
  it("known language returns output containing hljs span elements", () => {
    const code = "const x: number = 1;";
    const result = highlight(code, "typescript");
    // hljs wraps keywords/types in <span class="hljs-..."> elements
    expect(result).toContain("<span");
    expect(result).toContain("hljs-");
  });

  it("unknown language returns HTML-escaped text without throwing", () => {
    expect(() => highlight("some code", "cobol")).not.toThrow();
    const result = highlight("some code", "cobol");
    expect(result).toContain("some code");
    // No hljs spans expected for unknown language (plain escaping)
    expect(result).not.toContain('class="hljs-');
  });

  it("unknown language HTML-escapes characters that are special in HTML", () => {
    const code = '<script>alert("xss")</script>';
    const result = highlight(code, "not-a-language");
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("unknown language does not throw even if language string is empty", () => {
    expect(() => highlight("code", "")).not.toThrow();
  });

  it("html language (mapped to xml grammar) produces span output", () => {
    const code = "<div>hello</div>";
    const result = highlight(code, "html");
    expect(result).toContain("<span");
  });
});

// ---------------------------------------------------------------------------
// wrapLines()
// ---------------------------------------------------------------------------

describe("wrapLines()", () => {
  it("empty string returns empty string", () => {
    const result = wrapLines("", []);
    expect(result).toBe("");
  });

  it("single line with no trailing newline produces exactly one dk-code-line", () => {
    const html = '<span class="hljs-keyword">const</span> x = 1';
    const result = wrapLines(html, []);
    const matches = result.match(/class="dk-code-line"/g);
    expect(matches).toHaveLength(1);
    expect(result).toContain('data-line="1"');
    // Outer span should close every inner span correctly
    expect(result).toContain("</span>");
  });

  it("single line with no highlight_lines does NOT carry data-highlighted", () => {
    const html = "hello";
    const result = wrapLines(html, []);
    expect(result).not.toContain("data-highlighted");
  });

  it("trailing newline does NOT produce an empty extra dk-code-line", () => {
    // Two visible lines + trailing \n → exactly 2 dk-code-line wrappers
    const html = "line one\nline two\n";
    const result = wrapLines(html, []);
    const matches = result.match(/class="dk-code-line"/g);
    expect(matches).toHaveLength(2);
  });

  it("multi-line input produces one dk-code-line per visible line", () => {
    const html = "alpha\nbeta\ngamma";
    const result = wrapLines(html, []);
    const matches = result.match(/class="dk-code-line"/g);
    expect(matches).toHaveLength(3);
  });

  it("highlight_lines=[] wraps all lines but none carry data-highlighted", () => {
    const html = "line1\nline2\nline3";
    const result = wrapLines(html, []);
    const wrapCount = result.match(/class="dk-code-line"/g);
    expect(wrapCount).toHaveLength(3);
    expect(result).not.toContain("data-highlighted");
  });

  it("highlight_lines targeting a line adds data-highlighted and aria-label", () => {
    const html = "line1\nline2\nline3";
    const result = wrapLines(html, [2]);
    // Line 2 should be highlighted
    expect(result).toContain('data-line="2" data-highlighted aria-label="highlighted"');
    // Lines 1 and 3 should NOT be highlighted
    expect(result).toContain('data-line="1"');
    expect(result).not.toMatch(/data-line="1"[^>]*data-highlighted/);
    expect(result).toContain('data-line="3"');
    expect(result).not.toMatch(/data-line="3"[^>]*data-highlighted/);
  });

  // -------------------------------------------------------------------------
  // CRITICAL: multi-line span straddling (AC-03)
  // Simulates an hljs span (e.g. a string literal) that opens on line 1 and
  // closes on line 3, crossing two \n boundaries.
  // -------------------------------------------------------------------------

  it("straddling span: each line gets exactly one dk-code-line wrapper", () => {
    // Craft HTML that mimics hljs output for a multi-line string:
    //   <span class="hljs-string">`hello\nworld\nfoo`</span>
    const html = '<span class="hljs-string">`hello\nworld\nfoo`</span>';
    const result = wrapLines(html, []);
    const wrapperCount = result.match(/class="dk-code-line"/g);
    expect(wrapperCount).toHaveLength(3);
  });

  it("straddling span: inner span is re-opened on each continuation line", () => {
    const html = '<span class="hljs-string">`line1\nline2`</span>';
    const result = wrapLines(html, []);
    // Both lines should contain the opening span tag
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
    // Each dk-code-line should contain the hljs-string span opening
    for (const line of lines) {
      expect(line).toContain('class="hljs-string"');
    }
  });

  it("straddling span: no unclosed spans in any emitted line", () => {
    const html = '<span class="hljs-string">`line1\nline2\nline3`</span>';
    const result = wrapLines(html, []);
    const lines = result.split("\n");
    for (const line of lines) {
      // Count opening and closing spans — they should balance
      const openCount = (line.match(/<span/g) ?? []).length;
      const closeCount = (line.match(/<\/span>/g) ?? []).length;
      expect(openCount).toBe(closeCount);
    }
  });

  it("straddling span: line inside a straddling span gets data-highlighted when targeted", () => {
    // 3-line string span; highlight line 2 (the middle)
    const html = '<span class="hljs-string">`first\nsecond\nthird`</span>';
    const result = wrapLines(html, [2]);
    const lines = result.split("\n");
    // Line 2 (index 1) should carry data-highlighted
    expect(lines[1]).toContain("data-highlighted");
    expect(lines[1]).toContain('aria-label="highlighted"');
    // Lines 1 and 3 should not
    expect(lines[0]).not.toContain("data-highlighted");
    expect(lines[2]).not.toContain("data-highlighted");
  });

  it("straddling span: the straddling span re-opens correctly on line 2 of 2", () => {
    // One hljs string span crossing a single newline
    const html = '<span class="hljs-string">a\nb</span>';
    const result = wrapLines(html, []);
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
    // Line 2 must re-open the string span inside dk-code-line
    expect(lines[1]).toContain('class="hljs-string"');
    // And line 2 should close the string span before closing dk-code-line
    // i.e., </span></span> — string close + dk-code-line close
    expect(lines[1]).toMatch(/<\/span><\/span>/);
  });
});

// ---------------------------------------------------------------------------
// Integration: highlight() → wrapLines() pipeline
// ---------------------------------------------------------------------------

describe("highlight() → wrapLines() integration", () => {
  it("multi-line typescript input wraps each line exactly once", () => {
    const code = "const a = 1;\nconst b = 2;\nconst c = 3;";
    const tokenized = highlight(code, "typescript");
    const result = wrapLines(tokenized, []);
    const matches = result.match(/class="dk-code-line"/g);
    expect(matches).toHaveLength(3);
  });

  it("highlight_lines pointing into the tokenized output adds data-highlighted", () => {
    const code = "const a = 1;\nconst b = 2;";
    const tokenized = highlight(code, "typescript");
    const result = wrapLines(tokenized, [1]);
    expect(result).toContain('data-line="1" data-highlighted aria-label="highlighted"');
    expect(result).not.toMatch(/data-line="2"[^>]*data-highlighted/);
  });
});
