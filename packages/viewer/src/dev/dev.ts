/**
 * Dev harness entry — boots the viewer against the sample deck embedded in
 * harness.html. Excluded from the published build (tsconfig exclude, package
 * files array). Not part of the public API.
 */
import { boot } from "../index.js";

boot();
