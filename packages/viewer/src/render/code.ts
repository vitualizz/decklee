/**
 * Code layout twin — DOM-identical to Code.astro
 * (see __snapshots__/Code.test.ts.snap). Reuses highlight()+wrapLines() from
 * @decklee/design-system so the tokenized markup matches the primitive exactly;
 * the result is injected via innerHTML (NOT textContent) to preserve the
 * dk-code-line / hljs span structure.
 */
import { highlight, wrapLines } from "@decklee/design-system";
import type { CodeProps } from "@decklee/schema";

const CAPTION_ID = "dk-code-cap";

export function renderCode(props: CodeProps): HTMLElement {
  const section = document.createElement("section");
  section.className = "dk-code";
  section.setAttribute("data-layout", "code");

  if (props.heading) {
    const heading = document.createElement("h2");
    heading.className = "dk-code__heading";
    heading.textContent = props.heading;
    section.appendChild(heading);
  }

  const pre = document.createElement("pre");
  pre.className = "dk-code__pre";
  if (props.caption) {
    pre.setAttribute("aria-describedby", CAPTION_ID);
  }

  const codeEl = document.createElement("code");
  codeEl.className = "hljs dk-code__code";
  codeEl.setAttribute("data-lang", props.language);
  codeEl.innerHTML = wrapLines(
    highlight(props.code, props.language),
    props.highlight_lines ?? [],
  );
  pre.appendChild(codeEl);
  section.appendChild(pre);

  if (props.caption) {
    const caption = document.createElement("p");
    caption.className = "dk-code__caption";
    caption.setAttribute("id", CAPTION_ID);
    caption.textContent = props.caption;
    section.appendChild(caption);
  }

  return section;
}
