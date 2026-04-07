// Format detection

// Decoders
export { buildGenericInitialState, decodeGeneric } from "./decode-generic.js";
export { decodeJsonTestVector } from "./decode-json-test-vector.js";
export type { SpiDecodeResult } from "./decode-spi.js";
export { decodeSpi, stripMetadata, tryDecodeSpi } from "./decode-spi.js";
export { decodeTrace } from "./decode-trace.js";
export type { DetectedFormat, JsonTestVector } from "./detect.js";
export { canDecodeSpi, detectFormat } from "./detect.js";
export type {
  ExampleCategory,
  ExampleEntry,
  ExamplesManifest,
} from "./examples-manifest.js";
// Examples manifest
export {
  findExampleEntry,
  getExamplesManifest,
  initManifest,
  manifestEntrypointToParams,
  manifestInitialStateOverrides,
} from "./examples-manifest.js";
export type { RawPayload } from "./program-envelope.js";
// Program envelope
export { createProgramEnvelope } from "./program-envelope.js";

// Source adapters
export { loadExample } from "./sources/example.js";
export {
  clearPersistedPayload,
  loadLocalStorage,
  persistPayload,
} from "./sources/local-storage.js";
export { loadManualInput } from "./sources/manual-input.js";
export { loadUpload } from "./sources/upload.js";
export { loadUrl, rewriteGitHubBlobUrl } from "./sources/url.js";
export type {
  AccumulateParams,
  IsAuthorizedParams,
  RefineParams,
  SpiEntrypointParams,
} from "./spi-entrypoint.js";
// SPI entrypoint encoding
export { decodeSpiEntrypoint, encodeSpiEntrypoint } from "./spi-entrypoint.js";
