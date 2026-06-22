import { defineConfig } from "astro/config";

// Static showcase: no SSR adapter, no framework integrations — pure .astro.
// Workspace @decklee/* packages resolve via pnpm symlinks; no Vite aliases.
export default defineConfig({
  output: "static",
  integrations: [],
});
