import { pvm_interpreter as pvm } from "@typeberry/lib";

export type DecodedSpiProgram = {
  code: Uint8Array;
  memory: pvm.spi.SpiMemory;
  registers: BigUint64Array;
  metadata?: Uint8Array;
};

export function decodeSpiWithMetadata(blob: Uint8Array, args: Uint8Array): DecodedSpiProgram {
  try {
    return tryAsSpi(blob, args, true);
  } catch (e) {
    console.warn("Not an SPI with metadata: ", e);
  }

  try {
    return tryAsSpi(blob, args, false);
  } catch (e) {
    console.warn("Not an SPI", e);
    throw e;
  }
}

function tryAsSpi(blob: Uint8Array, args: Uint8Array, withMetadata: boolean): DecodedSpiProgram {
  const { code: spiCode, metadata } = withMetadata
    ? pvm.extractCodeAndMetadata(blob)
    : { code: blob, metadata: undefined };
  const program = pvm.spi.decodeStandardProgram(spiCode, args);

  return {
    code: program.code,
    memory: program.memory,
    registers: program.registers,
    metadata,
  };
}
