/**
 * play.ts — the component-playground type contract.
 *
 * PURE TYPES ONLY. No import.meta.glob, no component imports, no Astro
 * internals — vitest (and any plain .ts) imports this module directly. The
 * glob that discovers *.demo.ts fixtures lives exclusively in .astro
 * frontmatter and getStaticPaths() (TR-1).
 *
 * A PlayFixture is one primitive's full variant set; a PlayVariant is one
 * named render. Every variant's props carry theme_id:'dev' (the host
 * handshake); schema validation strips theme_id before safeParse (TR-4).
 */

/** One named render of a primitive. `stress:true` marks an intentional overflow case. */
export type PlayVariant<P = Record<string, unknown>> = {
  name: string;
  props: P;
  note?: string;
  stress?: boolean;
};

/**
 * One primitive's playground fixture.
 *
 * `component` is intentionally `any`: importing AstroComponentFactory from an
 * internal astro path is brittle, and the dynamic `{...props as any}` spread
 * needs the cast regardless (obs-2633).
 */
export type PlayFixture<P = Record<string, unknown>> = {
  name: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: any;
  tier: "locked" | "draft";
  variants: PlayVariant<P>[];
};

/** One sidebar tree leaf — a plain link destination. */
export type NavLeaf = { label: string; href: string; external?: boolean };

/**
 * One sidebar tree node. Either a top-level leaf (href set, children empty) or
 * a collapsible group (children populated, href absent). `external` marks the
 * set-apart 'See it live →' leaf; `_open` is the build-time <details open> flag.
 */
export type NavGroup = {
  label: string;
  href?: string;
  children: NavLeaf[];
  external?: boolean;
  _open?: boolean;
};

/** One Home-page quick-link card. */
export type QuickLink = {
  label: string;
  eyebrow?: string;
  href: string;
  description?: string;
};

