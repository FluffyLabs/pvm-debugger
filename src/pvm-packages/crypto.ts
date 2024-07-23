import type { Bytes } from "./bytes";
import type { Opaque } from "./opaque";

export type Ed25519Key = Opaque<Bytes<32>, "ed25519">;
export type BandersnatchKey = Opaque<Bytes<32>, "BandersnatchKey">;
export type BlsKey = Opaque<Bytes<144>, "bls">;
