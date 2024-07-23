import type { Bytes } from "./bytes";
import type { Opaque } from "./opaque";

export type Hash = Bytes<32>;
export type EntropyHash = Opaque<Hash, "entropy">;
