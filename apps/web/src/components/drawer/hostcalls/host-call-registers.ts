import type { RegisterFormat } from "../../../lib/fetch-utils";

/** Metadata for a single input register. */
export interface RegisterMeta {
  /** Register index (0-12). */
  index: number;
  /** Human-readable label (e.g. "dest", "offset"). */
  label: string;
  /** Display format for this register's value. */
  format: RegisterFormat;
}

/** Metadata for the output register (typically ω₇). */
export interface OutputRegisterMeta {
  index: number;
  label: string;
  format: RegisterFormat;
}

/** Per-handler register metadata. */
export interface HandlerRegisterMeta {
  inputs: RegisterMeta[];
  output: OutputRegisterMeta;
}

/** Register metadata per host call index. */
export const HOST_CALL_REGISTER_META: Record<number, HandlerRegisterMeta> = {
  // gas (0)
  0: {
    inputs: [],
    output: { index: 7, label: "gas remaining", format: "decimal" },
  },
  // fetch (1)
  1: {
    inputs: [
      { index: 7, label: "dest", format: "hex" },
      { index: 8, label: "offset", format: "decimal" },
      { index: 9, label: "maxLen", format: "decimal" },
      { index: 10, label: "kind", format: "custom" },
      { index: 11, label: "param1", format: "decimal" },
      { index: 12, label: "param2", format: "decimal" },
    ],
    output: { index: 7, label: "total length", format: "decimal" },
  },
  // lookup (2)
  2: {
    inputs: [
      { index: 7, label: "service", format: "hex" },
      { index: 8, label: "keyPtr", format: "hex" },
      { index: 9, label: "keyLen", format: "decimal" },
      { index: 10, label: "dest", format: "hex" },
      { index: 11, label: "offset", format: "decimal" },
      { index: 12, label: "maxLen", format: "decimal" },
    ],
    output: { index: 7, label: "value length", format: "decimal" },
  },
  // read (3)
  3: {
    inputs: [
      { index: 7, label: "service", format: "hex" },
      { index: 8, label: "keyPtr", format: "hex" },
      { index: 9, label: "keyLen", format: "decimal" },
      { index: 10, label: "dest", format: "hex" },
      { index: 11, label: "offset", format: "decimal" },
      { index: 12, label: "maxLen", format: "decimal" },
    ],
    output: { index: 7, label: "value length", format: "decimal" },
  },
  // write (4)
  4: {
    inputs: [
      { index: 7, label: "keyPtr", format: "hex" },
      { index: 8, label: "keyLen", format: "decimal" },
      { index: 9, label: "valPtr", format: "hex" },
      { index: 10, label: "valLen", format: "decimal" },
    ],
    output: { index: 7, label: "prev length", format: "decimal" },
  },
  // info (5)
  5: {
    inputs: [
      { index: 7, label: "service", format: "hex" },
      { index: 8, label: "dest", format: "hex" },
      { index: 9, label: "offset", format: "decimal" },
      { index: 10, label: "maxLen", format: "decimal" },
    ],
    output: { index: 7, label: "value length", format: "decimal" },
  },
  // log (100)
  100: {
    inputs: [
      { index: 7, label: "dataPtr", format: "hex" },
      { index: 8, label: "dataLen", format: "decimal" },
    ],
    output: { index: 7, label: "result", format: "decimal" },
  },
};
