import type { Opaque } from "@typeberry/utils";

export type Hash = Opaque<void, "Hash">;
type U64 = bigint;

export class UnsealedHeader {
  // GP: H_p
  public parentHeaderHash: Hash;
  // GP: H_r
  public priorStateRoot: Hash;
  // GP: H_x
  public extrinsicHash: Hash;
  // GP: H_t
  public timeSlotIndex: U64 = BigInt(0);
  // GP: H_e
  public epoch: U64 = BigInt(0);
  // GP: H_w
  public winningTickets: undefined = undefined;
  // GP: H_j
  public judgementMarkers: undefined = undefined;
  // GP: H_k
  public bandersnatchBlockAuthor: undefined = undefined;
  // GP: H_v
  //
  // "the entropy yielding VRF signature"
  public vrfSignature: undefined = undefined;
}

export class Header {
  public header: UnsealedHeader = new UnsealedHeader();
  // GP: H_s
  public seal: undefined = undefined;
}
