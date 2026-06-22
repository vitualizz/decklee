/**
 * T-013 — renderCode unit tests (AC-01, AC-03).
 *
 * Tests: heading present/absent, caption + aria-describedby, highlight_lines
 * produce dk-code-line structure, innerHTML used (span markup present), no
 * data-astro-*, no inline style=.
 */
import { describe, it, expect } from "vitest";
import { renderCode } from "./code.js";

const MINIMAL = { code: "const x = 1;", language: "typescript" };

describe("renderCode — root element", () => {
  it("returns a <section> element", () => {
    const el = renderCode(MINIMAL);
    expect(el.tagName.toLowerCase()).toBe("section");
  });

  it("root has class 'dk-code'", () => {
    const el = renderCode(MINIMAL);
    expect(el.classList.contains("dk-code")).toBe(true);
  });

  it("root has data-layout='code'", () => {
    const el = renderCode(MINIMAL);
    expect(el.getAttribute("data-layout")).toBe("code");
  });

  it("does NOT emit any data-astro-* attributes", () => {
    const el = renderCode({ ...MINIMAL, heading: "H", caption: "C" });
    expect(el.outerHTML).not.toMatch(/data-astro-/);
  });

  it("does NOT emit any inline style= attributes", () => {
    const el = renderCode({ ...MINIMAL, heading: "H", caption: "C" });
    expect(el.outerHTML).not.toMatch(/\bstyle\s*=/i);
  });

  it("does NOT emit entrance animation classes", () => {
    const el = renderCode(MINIMAL);
    expect(el.outerHTML).not.toMatch(/\b(rise|ar|al|af|as|ag)\b/);
  });
});

describe("renderCode — pre and code elements", () => {
  it("renders a pre.dk-code__pre element", () => {
    const el = renderCode(MINIMAL);
    expect(el.querySelector("pre.dk-code__pre")).not.toBeNull();
  });

  it("renders code element with class 'hljs dk-code__code'", () => {
    const el = renderCode(MINIMAL);
    const codeEl = el.querySelector("code");
    expect(codeEl?.classList.contains("hljs")).toBe(true);
    expect(codeEl?.classList.contains("dk-code__code")).toBe(true);
  });

  it("code element carries data-lang attribute", () => {
    const el = renderCode({ code: "x = 1", language: "python" });
    const codeEl = el.querySelector("code");
    expect(codeEl?.getAttribute("data-lang")).toBe("python");
  });

  it("code element content is rendered via innerHTML (span markup present)", () => {
    const el = renderCode(MINIMAL);
    const codeEl = el.querySelector("code");
    // highlight() produces hljs <span> tokens; innerHTML must preserve them
    expect(codeEl?.innerHTML).toContain("<span");
    expect(codeEl?.innerHTML).toContain("dk-code-line");
  });
});

describe("renderCode — heading (conditional)", () => {
  it("heading truthy → h2.dk-code__heading rendered", () => {
    const el = renderCode({ ...MINIMAL, heading: "A TypeScript Example" });
    const h2 = el.querySelector("h2.dk-code__heading");
    expect(h2).not.toBeNull();
    expect(h2?.textContent).toBe("A TypeScript Example");
  });

  it("heading absent → NO h2 rendered", () => {
    const el = renderCode(MINIMAL);
    expect(el.querySelector("h2")).toBeNull();
  });

  it("h2 appears BEFORE pre in DOM order", () => {
    const el = renderCode({ ...MINIMAL, heading: "Heading" });
    const children = [...el.children];
    const h2Idx = children.findIndex((c) => c.tagName === "H2");
    const preIdx = children.findIndex((c) => c.tagName === "PRE");
    expect(h2Idx).toBeLessThan(preIdx);
  });
});

describe("renderCode — caption + aria-describedby (conditional)", () => {
  it("caption present → p.dk-code__caption[id='dk-code-cap'] rendered", () => {
    const el = renderCode({ ...MINIMAL, caption: "Listing 1 — greeting" });
    const p = el.querySelector("p.dk-code__caption");
    expect(p).not.toBeNull();
    expect(p?.getAttribute("id")).toBe("dk-code-cap");
    expect(p?.textContent).toBe("Listing 1 — greeting");
  });

  it("caption present → pre carries aria-describedby='dk-code-cap'", () => {
    const el = renderCode({ ...MINIMAL, caption: "Listing 1" });
    const pre = el.querySelector("pre");
    expect(pre?.getAttribute("aria-describedby")).toBe("dk-code-cap");
  });

  it("caption absent → NO p#dk-code-cap", () => {
    const el = renderCode(MINIMAL);
    expect(el.querySelector("#dk-code-cap")).toBeNull();
  });

  it("caption absent → pre does NOT carry aria-describedby", () => {
    const el = renderCode(MINIMAL);
    const pre = el.querySelector("pre");
    expect(pre?.hasAttribute("aria-describedby")).toBe(false);
  });

  it("caption appears AFTER pre in DOM order", () => {
    const el = renderCode({ ...MINIMAL, caption: "Cap" });
    const children = [...el.children];
    const preIdx = children.findIndex((c) => c.tagName === "PRE");
    const pIdx = children.findIndex((c) => c.tagName === "P");
    expect(pIdx).toBeGreaterThan(preIdx);
  });
});

describe("renderCode — highlight_lines (AC-03)", () => {
  it("highlight_lines=[1] → line 1 span has data-highlighted", () => {
    const el = renderCode({
      code: "const greeting = 'hello';\nconsole.log(greeting);",
      language: "typescript",
      highlight_lines: [1],
    });
    const codeEl = el.querySelector("code");
    expect(codeEl?.innerHTML).toContain("data-highlighted");
    expect(codeEl?.innerHTML).toContain('aria-label="highlighted"');
  });

  it("highlight_lines=[1] → dk-code-line data-line='1' has data-highlighted", () => {
    const el = renderCode({
      code: "line one\nline two\nline three",
      language: "bash",
      highlight_lines: [1],
    });
    const template = document.createElement("template");
    template.innerHTML = el.querySelector("code")!.innerHTML;
    const firstLine = template.content.querySelector('[data-line="1"]');
    expect(firstLine?.hasAttribute("data-highlighted")).toBe(true);
    const secondLine = template.content.querySelector('[data-line="2"]');
    expect(secondLine?.hasAttribute("data-highlighted")).toBe(false);
  });

  it("no highlight_lines → no data-highlighted in output", () => {
    const el = renderCode({ code: "just code", language: "bash" });
    expect(el.querySelector("code")?.innerHTML).not.toContain("data-highlighted");
  });

  it("each line wrapped in span.dk-code-line with data-line", () => {
    const el = renderCode({
      code: "line1\nline2",
      language: "bash",
      highlight_lines: [],
    });
    const template = document.createElement("template");
    template.innerHTML = el.querySelector("code")!.innerHTML;
    const lines = template.content.querySelectorAll(".dk-code-line");
    expect(lines.length).toBe(2);
    expect(lines[0].getAttribute("data-line")).toBe("1");
    expect(lines[1].getAttribute("data-line")).toBe("2");
  });
});
