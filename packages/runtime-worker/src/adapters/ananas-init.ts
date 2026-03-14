import type { AnanasApi } from "./ananas-shell.js";

let cachedInstance: AnanasApi | null = null;

/**
 * Initialize the Ananas WASM module using the inline release build.
 * Caches the instance for reuse.
 */
export async function initAnanas(): Promise<AnanasApi> {
  if (cachedInstance) return cachedInstance;

  // Use the release-inline entry which embeds WASM as base64
  const mod = await import("@fluffylabs/anan-as/release-inline");
  const instance = await mod.instantiate();
  cachedInstance = instance as unknown as AnanasApi;
  return cachedInstance;
}

/** Reset the cached instance (for testing). */
export function resetAnanasCache(): void {
  cachedInstance = null;
}
