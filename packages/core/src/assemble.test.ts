// @vitest-environment node

/**
 * assemble.test.ts -- integration tests for assembleTemplate().
 *
 * assembleTemplate() calls import.meta.resolve() internally. Vitest's Vite
 * transform rewrites import.meta.resolve to a stub that does not work, so we
 * cannot import assembleTemplate() and call it directly inside the Vitest
 * process. Instead, we spawn a child Node process that runs the function
 * natively (with --experimental-strip-types so it can import .ts directly)
 * and reads its HTML output. This keeps the tests inside src/*.test.ts while
 * still executing the real code path.
 *
 * All assertions are on STRING content -- jsdom does NOT execute the bundled
 * IIFE (reveal.js requires layout APIs jsdom lacks). A real render test is
 * E2E / QA with Playwright.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { execFile } from "node:child_process";
import { existsSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Viewer dist gate
// Direct filesystem check: viewer is a workspace package in node_modules.
// import.meta.resolve is intercepted by Vitest's transform; use URL math.
// ---------------------------------------------------------------------------

function viewerDistExists(): boolean {
  try {
    const distPath = fileURLToPath(
      new URL(
        "../node_modules/@decklee/viewer/dist/index.js",
        import.meta.url,
      ),
    );
    return existsSync(distPath);
  } catch {
    return false;
  }
}

const HAS_VIEWER_DIST = viewerDistExists();

// ---------------------------------------------------------------------------
// Helper: run assembleTemplate() in a child process and return the HTML.
// We write a tiny .mjs script to a temp file and run it with node.
// ---------------------------------------------------------------------------

async function runAssembleInSubprocess(theme?: string): Promise<string> {
  const thisDir = fileURLToPath(new URL(".", import.meta.url));
  const scriptPath = join(tmpdir(), `assemble-runner-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);

  // The runner imports assemble.ts directly via --experimental-strip-types.
  // assemble.ts lives next to this test file in src/. The theme arg (if any)
  // is passed through to exercise AssembleOpts.theme resolution.
  const optsLiteral = theme === undefined ? "" : JSON.stringify({ theme });
  const scriptContent = `
import { assembleTemplate } from ${JSON.stringify(join(thisDir, "assemble.ts"))};
const html = await assembleTemplate(${optsLiteral});
process.stdout.write(html);
`;

  writeFileSync(scriptPath, scriptContent, "utf-8");

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--experimental-strip-types", scriptPath],
      {
        cwd: thisDir,
        timeout: 60_000, // 60s for esbuild cold-start
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: { ...process.env },
      },
    );
    return stdout;
  } finally {
    try { rmSync(scriptPath); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Integration suite -- requires viewer dist and Node 22 strip-types
// ---------------------------------------------------------------------------

describe.skipIf(!HAS_VIEWER_DIST)("assembleTemplate() integration", () => {
  let html: string;

  // Run assembleTemplate once via subprocess; share the result across all tests.
  beforeAll(async () => {
    html = await runAssembleInSubprocess();
  }, 90_000); // 90s: subprocess + esbuild cold-start

  // --- document structure ---------------------------------------------------

  it("starts with <!doctype html> (case-insensitive)", () => {
    expect(html.toLowerCase().trimStart()).toMatch(/^<!doctype html/);
  });

  it("contains <html lang=\"en\"> opening tag", () => {
    expect(html).toContain('<html lang="en">');
  });

  // --- Google Fonts links ---------------------------------------------------

  it("contains preconnect link to fonts.googleapis.com", () => {
    expect(html).toContain('<link rel="preconnect" href="https://fonts.googleapis.com">');
  });

  it("contains preconnect link to fonts.gstatic.com with crossorigin", () => {
    expect(html).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  });

  it("contains the Google Fonts css2 link with Space Grotesk", () => {
    expect(html).toContain("fonts.googleapis.com/css2");
    expect(html).toContain("Space+Grotesk");
  });

  it("contains Instrument+Sans in the Google Fonts link", () => {
    expect(html).toContain("Instrument+Sans");
  });

  it("contains JetBrains+Mono in the Google Fonts link", () => {
    expect(html).toContain("JetBrains+Mono");
  });

  it("has exactly the correct rel=stylesheet link (Google Fonts css2)", () => {
    const linkMatches = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/gi)];
    expect(linkMatches.length).toBeGreaterThanOrEqual(1);
    const fontLink = linkMatches.find((m) => m[0].includes("fonts.googleapis.com"));
    expect(fontLink).toBeDefined();
  });

  // --- Inline style ---------------------------------------------------------

  it("contains a non-empty <style> block", () => {
    const m = html.match(/<style>([\s\S]*?)<\/style>/);
    expect(m).not.toBeNull();
    expect(m![1].trim().length).toBeGreaterThan(100);
  });

  it("inline <style> contains .reveal selector (from reveal.css)", () => {
    const m = html.match(/<style>([\s\S]*?)<\/style>/);
    expect(m).not.toBeNull();
    expect(m![1]).toContain(".reveal");
  });

  it("inline <style> contains -- (CSS custom property from design-system tokens)", () => {
    const m = html.match(/<style>([\s\S]*?)<\/style>/);
    expect(m).not.toBeNull();
    // Design-system tokens define custom properties like --dk-*
    expect(m![1]).toContain("--");
  });

  it("inline <style> does NOT contain external url() (non-Google Fonts hosts)", () => {
    const m = html.match(/<style>([\s\S]*?)<\/style>/);
    expect(m).not.toBeNull();
    const styleBlock = m![1];
    // Scan for external url() calls that are not Google Fonts
    const externalUrls = [...styleBlock.matchAll(/url\(\s*['"]?(?:https?:)?\/\/([^/'")\s]+)/gi)];
    const nonFontUrls = externalUrls.filter((match) => {
      const host = match[1];
      return host !== "fonts.googleapis.com" && host !== "fonts.gstatic.com";
    });
    expect(nonFontUrls).toHaveLength(0);
  });

  it("inline <style> does NOT contain url(http pointing to non-font host", () => {
    const m = html.match(/<style>([\s\S]*?)<\/style>/);
    expect(m).not.toBeNull();
    const styleBlock = m![1];
    // data: URIs (reveal.css icon glyphs) are permitted
    const httpUrls = [...styleBlock.matchAll(/url\(\s*['"]?https?:\/\//gi)];
    const nonFontHttp = httpUrls.filter((match) => {
      return (
        !match[0].includes("fonts.googleapis.com") &&
        !match[0].includes("fonts.gstatic.com")
      );
    });
    expect(nonFontHttp).toHaveLength(0);
  });

  // --- Reveal shell ---------------------------------------------------------

  it("contains <div class=\"reveal\">", () => {
    expect(html).toContain('<div class="reveal">');
  });

  it("contains <div class=\"slides\">", () => {
    expect(html).toContain('<div class="slides">');
  });

  // --- noscript / fallback --------------------------------------------------

  it("contains <noscript> with the NO_JS_MESSAGE text", () => {
    expect(html).toContain("<noscript>");
    expect(html).toContain("Enable JavaScript to view this presentation.");
  });

  // --- Deck island ----------------------------------------------------------

  it("contains the empty deck island with id decklee-deck and content {}", () => {
    expect(html).toContain(
      '<script type="application/json" id="decklee-deck">{}',
    );
  });

  // --- IIFE bundle ----------------------------------------------------------

  it("contains a non-empty inline <script> (bundled IIFE, not a src reference)", () => {
    // Match an inline script without a src= attribute
    const inlineScripts = [
      ...html.matchAll(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi),
    ];
    // At least one non-JSON inline script with non-trivial length
    const iife = inlineScripts.find(
      (m) =>
        !m[0].includes('type="application/json"') && m[1].trim().length > 500,
    );
    expect(iife).toBeDefined();
  });

  it("IIFE bundle is non-trivial in length (> 5000 chars)", () => {
    const inlineScripts = [
      ...html.matchAll(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi),
    ];
    const iifeLengths = inlineScripts
      .filter((m) => !m[0].includes('type="application/json"'))
      .map((m) => m[1].trim().length);
    expect(Math.max(...iifeLengths)).toBeGreaterThan(5000);
  });

  // --- No external scripts --------------------------------------------------

  it("does NOT contain <script src= (no external script references)", () => {
    expect(html.toLowerCase()).not.toMatch(/<script\s[^>]*src\s*=/);
  });

  it("does NOT contain <link rel=\"stylesheet\" pointing to non-Google Fonts URL", () => {
    const stylesheetLinks = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/gi)];
    const nonFontStylesheets = stylesheetLinks.filter((m) => {
      return !m[0].includes("fonts.googleapis.com");
    });
    expect(nonFontStylesheets).toHaveLength(0);
  });

  // --- Version comments -----------------------------------------------------

  it("contains <!-- decklee-template-version: ... --> comment", () => {
    expect(html).toContain("<!-- decklee-template-version:");
  });

  it("contains <!-- decklee-reveal-version: ... --> comment", () => {
    expect(html).toContain("<!-- decklee-reveal-version:");
  });

  it("version comments have non-empty version strings", () => {
    const coreMatch = html.match(/<!-- decklee-template-version: ([^\s-]+)/);
    const revealMatch = html.match(/<!-- decklee-reveal-version: ([^\s-]+)/);
    expect(coreMatch).not.toBeNull();
    expect(revealMatch).not.toBeNull();
    expect(coreMatch![1].length).toBeGreaterThan(0);
    expect(revealMatch![1].length).toBeGreaterThan(0);
  });

  // --- Smoke test: does not throw -------------------------------------------

  it("assembleTemplate() completes without throwing (subprocess exit 0)", () => {
    // If we reached here, beforeAll + subprocess completed -- html is defined.
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(1000);
  });
});

// ---------------------------------------------------------------------------
// Theme resolution suite -- AssembleOpts.theme wiring (default dev + aurora)
// ---------------------------------------------------------------------------

describe.skipIf(!HAS_VIEWER_DIST)("assembleTemplate() theme resolution", () => {
  function styleBlock(html: string): string {
    const m = html.match(/<style>([\s\S]*?)<\/style>/);
    expect(m).not.toBeNull();
    return m![1];
  }

  it("defaults to the dev theme when no theme is provided", async () => {
    const html = await runAssembleInSubprocess();
    const css = styleBlock(html);
    expect(css).toContain('[data-theme="dev"]');
    expect(css).not.toContain('[data-theme="aurora"]');
  });

  it("inlines the aurora theme CSS when theme: 'aurora' is provided", async () => {
    const html = await runAssembleInSubprocess("aurora");
    const css = styleBlock(html);
    expect(css).toContain('[data-theme="aurora"]');
    // Aurora's art-direction gradient lands in the inlined CSS (standalone HTML).
    expect(css).toContain("linear-gradient");
  }, 90_000);

  it("aurora CSS stays self-contained (no external url() in the <style>)", async () => {
    const html = await runAssembleInSubprocess("aurora");
    const css = styleBlock(html);
    const externalUrls = [
      ...css.matchAll(/url\(\s*['"]?(?:https?:)?\/\/([^/'")\s]+)/gi),
    ].filter((m) => {
      const host = m[1];
      return host !== "fonts.googleapis.com" && host !== "fonts.gstatic.com";
    });
    expect(externalUrls).toHaveLength(0);
  }, 90_000);

  it("throws (subprocess exit != 0) for an unknown theme_id", async () => {
    await expect(runAssembleInSubprocess("does-not-exist")).rejects.toThrow();
  }, 90_000);
});
