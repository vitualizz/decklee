/**
 * Hero layout twin — DOM-identical to design-system's Hero.astro primitive
 * (see __snapshots__/Hero.test.ts.snap). Child order is load-bearing for the
 * parity gate: eyebrow, headline, subheadline, cta, background image.
 */
import type { HeroProps } from "@decklee/schema";

const DEFAULT_BACKGROUND_TREATMENT = "color";

export function renderHero(props: HeroProps): HTMLElement {
  const root = document.createElement("div");
  root.className = "dk-hero";
  root.setAttribute("data-layout", "hero");

  if (props.eyebrow) {
    const eyebrow = document.createElement("p");
    eyebrow.className = "dk-hero__eyebrow";
    eyebrow.textContent = props.eyebrow;
    root.appendChild(eyebrow);
  }

  const headline = document.createElement("h1");
  headline.className = "dk-hero__headline";
  headline.textContent = props.headline;
  root.appendChild(headline);

  if (props.subheadline) {
    const subheadline = document.createElement("p");
    subheadline.className = "dk-hero__subheadline";
    subheadline.textContent = props.subheadline;
    root.appendChild(subheadline);
  }

  if (props.cta_label) {
    const cta = document.createElement("p");
    cta.className = "dk-hero__cta";
    cta.textContent = props.cta_label;
    root.appendChild(cta);
  }

  const treatment = props.background_treatment ?? DEFAULT_BACKGROUND_TREATMENT;
  if (treatment === "image" && props.image_src) {
    const img = document.createElement("img");
    img.className = "dk-hero__bg";
    img.setAttribute("src", props.image_src);
    img.setAttribute("alt", props.image_alt ?? "");
    root.appendChild(img);
  }

  return root;
}
