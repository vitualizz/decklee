/**
 * Hero layout twin — DOM-identical to design-system's Hero.astro primitive
 * (see __snapshots__/Hero.test.ts.snap). Child order is load-bearing for the
 * parity gate: eyebrow, headline, subheadline, cta, background image.
 */
import type { HeroProps } from "@decklee/schema";

const DEFAULT_BACKGROUND_TREATMENT = "color";

export function renderHero(props: HeroProps): HTMLElement {
  const section = document.createElement("section");
  section.className = "dk-hero";
  section.setAttribute("data-layout", "hero");

  if (props.eyebrow) {
    const eyebrow = document.createElement("p");
    eyebrow.className = "dk-hero__eyebrow";
    eyebrow.textContent = props.eyebrow;
    section.appendChild(eyebrow);
  }

  const headline = document.createElement("h1");
  headline.className = "dk-hero__headline";
  headline.textContent = props.headline;
  section.appendChild(headline);

  if (props.subheadline) {
    const subheadline = document.createElement("p");
    subheadline.className = "dk-hero__subheadline";
    subheadline.textContent = props.subheadline;
    section.appendChild(subheadline);
  }

  if (props.cta_label) {
    const cta = document.createElement("p");
    cta.className = "dk-hero__cta";
    cta.textContent = props.cta_label;
    section.appendChild(cta);
  }

  const treatment = props.background_treatment ?? DEFAULT_BACKGROUND_TREATMENT;
  if (treatment === "image" && props.image_src) {
    const img = document.createElement("img");
    img.className = "dk-hero__bg";
    img.setAttribute("src", props.image_src);
    img.setAttribute("alt", props.image_alt ?? "");
    section.appendChild(img);
  }

  return section;
}
