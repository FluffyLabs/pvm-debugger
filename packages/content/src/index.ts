// Format detection
export { detectFormat, canDecodeSpi } from "./detect.js";
export type { DetectedFormat, JsonTestVector } from "./detect.js";

// Decoders
export { decodeGeneric, buildGenericInitialState } from "./decode-generic.js";
export { decodeJsonTestVector } from "./decode-json-test-vector.js";
export { decodeSpi, tryDecodeSpi, stripMetadata } from "./decode-spi.js";
export type { SpiDecodeResult } from "./decode-spi.js";
export { decodeTrace } from "./decode-trace.js";

// SPI entrypoint encoding
export { encodeSpiEntrypoint, decodeSpiEntrypoint } from "./spi-entrypoint.js";
export type {
  SpiEntrypointParams,
  RefineParams,
  AccumulateParams,
  IsAuthorizedParams,
} from "./spi-entrypoint.js";

// Program envelope
export { createProgramEnvelope } from "./program-envelope.js";
export type { RawPayload } from "./program-envelope.js";

// Source adapters
export { loadExample } from "./sources/example.js";
export { loadUpload } from "./sources/upload.js";
export { loadManualInput } from "./sources/manual-input.js";
export { loadUrl, rewriteGitHubBlobUrl } from "./sources/url.js";
export {
  loadLocalStorage,
  persistPayload,
  clearPersistedPayload,
} from "./sources/local-storage.js";

// Examples manifest
export {
  getExamplesManifest,
  findExampleEntry,
  initManifest,
  manifestEntrypointToParams,
  manifestInitialStateOverrides,
} from "./examples-manifest.js";
export type {
  ExampleEntry,
  ExampleCategory,
  ExamplesManifest,
} from "./examples-manifest.js";
