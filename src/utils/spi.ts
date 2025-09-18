import { pvm } from "@typeberry/lib";

export function decodeSpiWithMetadata(blob: Uint8Array, args: Uint8Array) {
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

function tryAsSpi(blob: Uint8Array, args: Uint8Array, withMetadata: boolean) {
  const { code: spiCode, metadata } = withMetadata ? pvm.extractCodeAndMetadata(blob) : { code: blob };
  const { code, memory, registers } = pvm.decodeStandardProgram(spiCode, args);

  return { code, memory, registers, metadata };
}
