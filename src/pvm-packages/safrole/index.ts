import type { Bytes, BytesBlob } from "@typeberry/bytes";
import type { Opaque } from "@typeberry/utils";
import { verifyBandersnatch } from "./bandersnatch";
import type { BandersnatchKey, BlsKey, Ed25519Key } from "./crypto";

export type Hash = Bytes<32>;
export type EntropyHash = Opaque<Hash, "entropy">;

export type TicketBody = {
  id: Hash;
  attempt: number;
};

export type ValidatorData = {
  ed25519: Ed25519Key;
  bandersnatch: BandersnatchKey;
  bls: BlsKey;
  metadata: BytesBlob;
};

export type TicketEnvelope = {
  attempt: number;
  signature: Bytes<784>;
};

export type State = {
  timeslot(): number;
  entropy(): [EntropyHash, EntropyHash, EntropyHash, EntropyHash];
  prevValidators(): ValidatorData[];
  currValidators(): ValidatorData[];
  nextValidators(): ValidatorData[];
  designedValidators(): ValidatorData[];
  ticketsAccumulator(): TicketBody[];
};

export type StateDiff = {
  timeslot?: number;
  entropy?: [EntropyHash];
  prevValidators?: ValidatorData[];
  currValidators?: ValidatorData[];
  nextValidators?: ValidatorData[];
  designedValidators?: ValidatorData[];
  ticketsAccumulator?: TicketBody[];
};

export class Safrole {
  state: State;

  constructor(state: State) {
    this.state = state;
  }

  async transition(input: { slot: number; entropy: EntropyHash; extrinsics: TicketEnvelope[] }): Promise<StateDiff> {
    const newState: StateDiff = {};
    if (this.state.timeslot() > input.slot) {
      throw new Error(`Timeslot is in the past. Current ${this.state.timeslot()}, got ${input.slot}`);
    }

    await verifyBandersnatch();

    newState.timeslot = input.slot;
    newState.entropy = [input.entropy];
    for (const v of input.extrinsics) {
      // TODO [ToDr] Verify signatures
    }

    return newState;
  }
}
