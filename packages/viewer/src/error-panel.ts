/**
 * Accessible validation error panel (AC-02). Appended to <body> as a live
 * region so assistive tech announces it immediately; styling is delegated
 * entirely to .dk-error-panel* classes (NO inline styles, NO hardcoded colors).
 */
import type { FieldError } from "@decklee/schema";

const PANEL_CLASS = "dk-error-panel";
const HEADING_TEXT = "This presentation could not be displayed";
const COPY_LABEL = "Copy errors";

export function renderErrorPanel(errors: FieldError[]): void {
  const panel = document.createElement("div");
  panel.className = PANEL_CLASS;
  panel.setAttribute("role", "alert");
  panel.setAttribute("aria-live", "assertive");

  const heading = document.createElement("h2");
  heading.className = "dk-error-panel__heading";
  heading.textContent = HEADING_TEXT;
  panel.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "dk-error-panel__list";
  for (const error of errors) {
    const item = document.createElement("li");
    item.className = "dk-error-panel__item";
    item.textContent = `${error.path}: ${error.message}`;
    list.appendChild(item);
  }
  panel.appendChild(list);

  const copyButton = document.createElement("button");
  copyButton.className = "dk-error-panel__copy";
  copyButton.type = "button";
  copyButton.textContent = COPY_LABEL;
  copyButton.addEventListener("click", () => {
    void navigator.clipboard.writeText(JSON.stringify(errors, null, 2));
  });
  panel.appendChild(copyButton);

  document.body.appendChild(panel);
}
