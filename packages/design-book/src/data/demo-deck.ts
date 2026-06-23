import { LAYOUT_IDS } from "@decklee/schema";

export interface DemoSlide {
  id: string;
  label: string;
  layout: (typeof LAYOUT_IDS)[number];
  props: Record<string, unknown> & { theme_id: string };
}

export const DEMO_SLIDES: DemoSlide[] = [
  // S1 — Cover
  {
    id: "s1", label: "Cover — Lumen", layout: "hero",
    props: {
      eyebrow: "LUMEN",
      headline: "Observability that explains itself.",
      subheadline: "AI-native incident intelligence for teams who are done staring at dashboards.",
      cta_label: "Series A — 2026",
      theme_id: "dev",
    },
  },
  // S2 — The Hook
  {
    id: "s2", label: "The Hook", layout: "quote",
    props: {
      quote: "It took us four hours to find out a config flag broke checkout. The data was all there. Nobody could see it.",
      attribution: "Every on-call engineer",
      context: "3am, last Tuesday",
      emphasis: "centered",
      theme_id: "dev",
    },
  },
  // S3 — The Cost
  {
    id: "s3", label: "The Cost", layout: "two-up",
    props: {
      left_heading: "The status quo",
      left_body: "Teams pay for five monitoring tools and still answer 'why did it break?' by hand — grepping logs while revenue leaks.",
      right_heading: "What it costs",
      right_body: "4+ hours of senior eng time to form a hypothesis — not to fix it, just to understand what happened.",
      divider: true,
      theme_id: "dev",
    },
  },
  // S4 — The Shift
  {
    id: "s4", label: "The Shift", layout: "hero",
    props: {
      eyebrow: "WHY NOW",
      headline: "Your data was never the problem. Reading it was.",
      subheadline: "Models can finally hold traces, logs, and your codebase in one context — and reason across all three.",
      theme_id: "dev",
    },
  },
  // S5 — What It Is [benefit-first per AC-2.15]
  {
    id: "s5", label: "What It Is", layout: "hero",
    props: {
      eyebrow: "MEET LUMEN",
      headline: "Lumen reads every signal and tells you what broke — in a sentence.",
      subheadline: "Correlates metrics, traces, and logs against your code, then delivers the root cause in plain language. One SDK. No dashboards.",
      theme_id: "dev",
    },
  },
  // S6 — How It Works / The Tech
  {
    id: "s6", label: "How It Works", layout: "code",
    props: {
      heading: "Three lines. Then it watches everything.",
      language: "typescript",
      code: `import { Lumen } from "@lumen/sdk";

Lumen.init({ service: "checkout-api" });

// That's it. Traces, logs, and deploys
// now stream to Lumen automatically.

const incident = await Lumen.explain(alertId);
console.log(incident.rootCause);
// → "Deploy a1f3c9 set RETRY_LIMIT=0;
//    checkout retries now fail fast."`,
      highlight_lines: [9, 10, 11],
      caption: "The explain() call returns a human root cause, not another dashboard.",
      theme_id: "dev",
    },
  },
  // S7 — Feature 1 [right_heading != "Why it matters" per AC-2.7]
  {
    id: "s7", label: "Feature — Auto Root-Cause", layout: "two-up",
    props: {
      left_heading: "Auto root-cause",
      left_body: "Every alert arrives with the answer attached — the deploy, the line, the blast radius — before you open your laptop.",
      right_heading: "First responder = last responder",
      right_body: "On-call stops being detective work. The first responder is already the last responder.",
      divider: true,
      theme_id: "dev",
    },
  },
  // S8 — Feature 2 [right_heading != "Why it matters" per AC-2.8]
  {
    id: "s8", label: "Feature — One Context", layout: "two-up",
    props: {
      left_heading: "One context, every signal",
      left_body: "Metrics, traces, logs, and your git history live in a single model context — so Lumen reasons the way your best engineer would.",
      right_heading: "No more tab-hopping",
      right_body: "No more switching across five tools to assemble a story by hand.",
      divider: true,
      theme_id: "dev",
    },
  },
  // S9 — Feature 3 [right_heading != "Why it matters" per AC-2.9]
  {
    id: "s9", label: "Feature — Ships With Code", layout: "two-up",
    props: {
      left_heading: "Ships with your code",
      left_body: "Lumen reads diffs as they merge, so a regression is traced to the exact commit the moment it lands — not the morning after.",
      right_heading: "Catch it in the PR",
      right_body: "You catch the break in the PR, not in the postmortem.",
      divider: true,
      theme_id: "dev",
    },
  },
  // S10 — Metrics [divider:false per AC-2.11]
  {
    id: "s10", label: "Metrics", layout: "two-up",
    props: {
      left_heading: "73% faster",
      left_body: "Median time-to-root-cause dropped from 47 minutes to under 13 across design-partner teams.",
      right_heading: "9 in 10 alerts",
      right_body: "arrive with a correct root cause attached — verified against resolved incidents.",
      divider: false,
      theme_id: "dev",
    },
  },
  // S11 — Social Proof [no "(fictional design partner)" per AC-2.5]
  {
    id: "s11", label: "Social Proof", layout: "quote",
    props: {
      quote: "We turned off three tools the week we installed Lumen. On-call went from dreaded to boring.",
      attribution: "Priya Raman",
      context: "VP Engineering, Fathom",
      emphasis: "centered",
      theme_id: "dev",
    },
  },
  // S12 — Before and After
  {
    id: "s12", label: "Before and After", layout: "two-up",
    props: {
      left_heading: "Before Lumen",
      left_body: "Alert fires. Five dashboards. A war room. Four hours. A guess.",
      right_heading: "After Lumen",
      right_body: "Alert fires. The root cause is already in the message. One click to the fix.",
      divider: true,
      theme_id: "dev",
    },
  },
  // S13 — Why Lumen
  {
    id: "s13", label: "Why Lumen", layout: "two-up",
    props: {
      left_heading: "Dashboards show you data",
      left_body: "Legacy observability hands you a thousand charts and calls it visibility. You still do the thinking.",
      right_heading: "Lumen does the thinking",
      right_body: "Lumen hands back an answer. Monitoring vs. understanding — that is the gap we close.",
      divider: true,
      theme_id: "dev",
    },
  },
  // S14 — The Lumen Thesis [emphasis:ruled, attribution absent per AC-2.13]
  {
    id: "s14", label: "The Lumen Thesis", layout: "quote",
    props: {
      quote: "The best dashboard is the one you never have to open.",
      context: "The Lumen thesis",
      emphasis: "ruled",
      theme_id: "dev",
    },
  },
  // S15 — Traction and the Ask
  {
    id: "s15", label: "Traction and the Ask", layout: "two-up",
    props: {
      left_heading: "Where we are",
      left_body: "40 design-partner teams, $1.2M ARR, 6 weeks from open beta — growing 22% month over month.",
      right_heading: "What we're raising",
      right_body: "$12M Series A to scale the model pipeline and open self-serve to every team on call tonight.",
      divider: true,
      theme_id: "dev",
    },
  },
  // S16 — Vision
  {
    id: "s16", label: "Vision", layout: "hero",
    props: {
      eyebrow: "WHERE THIS GOES",
      headline: "Every incident resolved before a customer ever notices.",
      subheadline: "Observability stops being a place you look and becomes an answer that finds you.",
      theme_id: "dev",
    },
  },
  // S17 — Closing CTA [cta_label per AC-2.12]
  {
    id: "s17", label: "Closing CTA", layout: "hero",
    props: {
      eyebrow: "LUMEN",
      headline: "Stop watching. Start knowing.",
      subheadline: "See Lumen explain a live incident in 90 seconds.",
      cta_label: "lumen.dev/demo",
      theme_id: "dev",
    },
  },
];
