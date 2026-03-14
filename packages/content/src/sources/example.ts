import type { RawPayload } from "../program-envelope.js";
import { findExampleEntry } from "../examples-manifest.js";

/**
 * Load an example by ID from the manifest.
 *
 * - If the example has a `file` field, it is loaded via fetch using a
 *   URL resolved relative to the provided `fixturesBaseUrl`.
 * - If the example has a `url` field, it is fetched directly.
 */
export async function loadExample(
  exampleId: string,
  fixturesBaseUrl?: string,
): Promise<RawPayload> {
  const entry = findExampleEntry(exampleId);
  if (!entry) {
    throw new Error(`Example not found: ${exampleId}`);
  }

  let bytes: Uint8Array;

  if (entry.url) {
    // Remote example — fetch directly
    const response = await fetch(entry.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch example ${exampleId}: ${response.status}`);
    }
    bytes = new Uint8Array(await response.arrayBuffer());
  } else if (entry.file) {
    // Bundled example — resolve relative to fixtures base
    const base = fixturesBaseUrl ?? resolveFixturesBase();
    const url = new URL(entry.file, base);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load fixture ${entry.file}: ${response.status}`);
    }
    bytes = new Uint8Array(await response.arrayBuffer());
  } else {
    throw new Error(`Example ${exampleId} has neither file nor url`);
  }

  return {
    sourceKind: "example",
    sourceId: exampleId,
    bytes,
  };
}

/** Resolve a base URL for fixtures directory. Works in Node and browser. */
function resolveFixturesBase(): string {
  // In Node.js tests, use file:// URL
  if (typeof process !== "undefined" && process.versions?.node) {
    // Use process.cwd() as base — fixtures/ is at the workspace root
    return new URL("../../fixtures/", import.meta.url).href;
  }
  // In browser builds, Vite resolves relative to the app
  return "/fixtures/";
}
