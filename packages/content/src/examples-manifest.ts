import type { SpiEntrypointParams } from "./spi-entrypoint.js";
import type { InitialMachineState } from "@pvmdbg/types";

/** Shape of a single example entry in the manifest. */
export interface ExampleEntry {
  id: string;
  name: string;
  file?: string;
  url?: string;
  format: string;
  entrypoint?: {
    type: "refine" | "accumulate" | "is_authorized";
    params: Record<string, string>;
  };
  initialState?: {
    pc?: number;
    gas?: number;
    registers?: number[];
    pageMap?: Array<{ address: number; length: number; isWritable: boolean }>;
  };
}

/** Shape of a category in the manifest. */
export interface ExampleCategory {
  id: string;
  name: string;
  description?: string;
  sourceUrl?: string;
  examples: ExampleEntry[];
}

/** Shape of the full manifest. */
export interface ExamplesManifest {
  categories: ExampleCategory[];
}

// Import the manifest JSON. TypeScript NodeNext requires explicit assertion.
// We use a dynamic approach so the same code works across environments.
let _manifest: ExamplesManifest | null = null;

function loadManifest(): ExamplesManifest {
  if (_manifest !== null) return _manifest;
  // At build time, the JSON will be resolved by the bundler or tsc.
  // We store a static copy for synchronous access.
  throw new Error(
    "Manifest not initialized. Call initManifest() first.",
  );
}

/**
 * Initialize the manifest from pre-loaded JSON data.
 *
 * **Must be called before** `getExamplesManifest()`, `findExampleEntry()`,
 * or `createProgramEnvelope()` with `sourceKind: "example"`.
 *
 * Typically called once at app startup:
 * ```ts
 * import manifest from "../../fixtures/examples.json";
 * initManifest(manifest);
 * ```
 */
export function initManifest(data: ExamplesManifest | { categories: unknown[] }): void {
  _manifest = data as ExamplesManifest;
}

/** Get the full examples manifest. Throws if `initManifest()` has not been called. */
export function getExamplesManifest(): ExamplesManifest {
  return loadManifest();
}

/** Find a single example entry by ID across all categories. */
export function findExampleEntry(exampleId: string): ExampleEntry | undefined {
  const manifest = loadManifest();
  for (const cat of manifest.categories) {
    const entry = cat.examples.find((e) => e.id === exampleId);
    if (entry) return entry;
  }
  return undefined;
}

/** Convert a manifest entrypoint definition to canonical SpiEntrypointParams. */
export function manifestEntrypointToParams(
  entry: NonNullable<ExampleEntry["entrypoint"]>,
): SpiEntrypointParams {
  switch (entry.type) {
    case "accumulate":
      return {
        entrypoint: "accumulate",
        pc: 5,
        params: {
          slot: parseInt(entry.params.slot ?? "0", 10),
          id: parseInt(entry.params.id ?? "0", 10),
          results: parseInt(entry.params.results ?? "0", 10),
        },
      };
    case "refine":
      return {
        entrypoint: "refine",
        pc: 0,
        params: {
          core: parseInt(entry.params.core ?? "0", 10),
          index: parseInt(entry.params.index ?? "0", 10),
          id: parseInt(entry.params.id ?? "0", 10),
          payload: new Uint8Array(),
          package: new Uint8Array(),
        },
      };
    case "is_authorized":
      return {
        entrypoint: "is_authorized",
        pc: 0,
        params: {
          core: parseInt(entry.params.core ?? "0", 10),
        },
      };
  }
}

/** Convert manifest initialState overrides to Partial<InitialMachineState>. */
export function manifestInitialStateOverrides(
  entry: NonNullable<ExampleEntry["initialState"]>,
): Partial<InitialMachineState> {
  const overrides: Partial<InitialMachineState> = {};
  if (entry.pc !== undefined) overrides.pc = entry.pc;
  if (entry.gas !== undefined) overrides.gas = BigInt(entry.gas);
  if (entry.registers !== undefined) overrides.registers = entry.registers.map(BigInt);
  if (entry.pageMap !== undefined) overrides.pageMap = entry.pageMap;
  return overrides;
}
