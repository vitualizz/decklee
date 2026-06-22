/**
 * TwoUp layout twin — DOM-identical to TwoUp.astro
 * (see __snapshots__/TwoUp.test.ts.snap). Each pane carries an aria-label ONLY
 * when it has no heading; the divider is present unless divider===false.
 */
import type { TwoUpItemType, TwoUpProps } from "@decklee/schema";

const DEFAULT_ITEM_TYPE: TwoUpItemType = "text";

interface PaneSpec {
  side: "left" | "right";
  heading: string | undefined;
  body: string;
  type: TwoUpItemType | undefined;
  imageSrc: string | undefined;
  imageAlt: string | undefined;
}

function buildPane(spec: PaneSpec): HTMLElement {
  const pane = document.createElement("div");
  pane.className = `dk-twoup__pane dk-twoup__pane--${spec.side}`;
  if (!spec.heading) {
    pane.setAttribute("aria-label", `${spec.side} panel`);
  }

  if (spec.heading) {
    const heading = document.createElement("h2");
    heading.className = "dk-twoup__heading";
    heading.textContent = spec.heading;
    pane.appendChild(heading);
  }

  const type = spec.type ?? DEFAULT_ITEM_TYPE;
  if (type === "image" && spec.imageSrc) {
    const img = document.createElement("img");
    img.className = "dk-twoup__image";
    img.setAttribute("src", spec.imageSrc);
    img.setAttribute("alt", spec.imageAlt ?? "");
    pane.appendChild(img);
  } else {
    const body = document.createElement("p");
    body.className = "dk-twoup__body";
    body.textContent = spec.body;
    pane.appendChild(body);
  }

  return pane;
}

export function renderTwoUp(props: TwoUpProps): HTMLElement {
  const section = document.createElement("section");
  section.className = "dk-twoup";
  section.setAttribute("data-layout", "two-up");

  section.appendChild(
    buildPane({
      side: "left",
      heading: props.left_heading,
      body: props.left_body,
      type: props.left_type,
      imageSrc: props.left_image_src,
      imageAlt: props.left_image_alt,
    }),
  );

  if (props.divider !== false) {
    const divider = document.createElement("div");
    divider.className = "dk-twoup__divider";
    divider.setAttribute("aria-hidden", "true");
    section.appendChild(divider);
  }

  section.appendChild(
    buildPane({
      side: "right",
      heading: props.right_heading,
      body: props.right_body,
      type: props.right_type,
      imageSrc: props.right_image_src,
      imageAlt: props.right_image_alt,
    }),
  );

  return section;
}
