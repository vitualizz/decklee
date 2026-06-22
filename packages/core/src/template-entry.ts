/**
 * Browser entry point bundled by esbuild into the inline IIFE. Do not import
 * this from Node.
 *
 * This is the SOLE esbuild entryPoint for assembleTemplate(). esbuild follows
 * the viewer's real imports — pulling in reveal.mjs, the Notes plugin
 * (reveal.js/plugin/notes, registered in viewer/src/reveal-config.ts), Zod,
 * and the highlight.js subset — and emits one minified IIFE.
 */
import { boot } from "@decklee/viewer";

boot();
