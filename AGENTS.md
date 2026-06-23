<!-- decklee-agents-md-version: 1 -->
<!-- GENERATED FILE — do not edit by hand. -->
<!-- Regenerate with: pnpm --filter decklee generate:agents-md -->

# DeckLee — Deck Authoring Contract

## THE RULE

You emit ONLY validated Deck JSON conforming to the schema below.
You NEVER write CSS, HTML, inline styles, `<style>` blocks, color values, or
markup of any kind. Styling is the theme's job, not the payload's. DeckLee
renders your JSON into reveal.js HTML — your only contract is the data.

## PRIMITIVES REFERENCE

Each slide has a `layout` (one of: `hero`, `two-up`, `code`, `quote`) and a
`content_props` object whose allowed fields are listed below. Unknown fields are
rejected (strict). `speaker_notes` is a string or null on every slide.

### hero

| Prop | Type | Required |
| --- | --- | --- |
| `headline` | `string` | yes |
| `subheadline` | `string` | no |
| `eyebrow` | `string` | no |
| `background_treatment` | `color|image|gradient` | no |
| `image_src` | `string` | no |
| `image_alt` | `string` | no |
| `cta_label` | `string` | no |

### two-up

| Prop | Type | Required |
| --- | --- | --- |
| `left_body` | `string` | yes |
| `right_body` | `string` | yes |
| `left_heading` | `string` | no |
| `right_heading` | `string` | no |
| `left_type` | `text|image|stat` | no |
| `right_type` | `text|image|stat` | no |
| `left_image_src` | `string` | no |
| `left_image_alt` | `string` | no |
| `right_image_src` | `string` | no |
| `right_image_alt` | `string` | no |
| `divider` | `boolean` | no |

### code

| Prop | Type | Required |
| --- | --- | --- |
| `code` | `string` | yes |
| `language` | `string` | yes |
| `heading` | `string` | no |
| `highlight_lines` | `number[]` | no |
| `caption` | `string` | no |

### quote

| Prop | Type | Required |
| --- | --- | --- |
| `quote` | `string` | yes |
| `attribution` | `string` | no |
| `context` | `string` | no |
| `emphasis` | `full|centered|ruled` | no |

## DECK JSON SHAPE

```json
{
  "schema_version": "1",
  "kind": "deck",
  "id": "deck-001",
  "meta": { "title": "My Talk", "theme_id": "dev", "source_outline_id": null },
  "slides": [
    {
      "id": "s1",
      "layout": "hero",
      "content_props": { "headline": "A Better Process" },
      "speaker_notes": "Open with the pain."
    },
    {
      "id": "s2",
      "layout": "quote",
      "content_props": { "quote": "Ship the contract, not the chaos.", "attribution": "DeckLee" },
      "speaker_notes": "Land the thesis."
    }
  ]
}
```

## THEME CATALOG

`theme_id` appears EXACTLY ONCE, at `meta.theme_id`. Never put it inside a slide
or `content_props`.

| theme_id | Voice |
| --- | --- |
| `dev` | Dark editorial — Space Grotesk / Instrument Sans / JetBrains Mono, oklch accents |
| `aurora` | Dark cosmic — premium, cinematic blue→violet gradient canvas with an electric headline glow |

## CONTENT CONSTRAINTS

- HC-03: these keys are banned ANYWHERE in `content_props`: `class`, `className`, `css`, `style`, `token`.
- No CSS-carrying string values (no `oklch(`, hex colors, `rgb(`, `<style`, `style=`).
- The lone exemption: the literal `code` field value on a `code` slide may contain
  source that incidentally matches those patterns.

## VERSION PIN

This contract targets DeckLee schema version `1`.
