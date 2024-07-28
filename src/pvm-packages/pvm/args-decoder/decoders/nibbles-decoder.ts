import { NO_OF_REGISTERS } from "../../registers";

const MAX_REGISTER_INDEX = NO_OF_REGISTERS - 1;
const MAX_LENGTH = 4;

export class NibblesDecoder {
  private byte = new Int8Array(1);

  setByte(byte: number) {
    this.byte[0] = byte;
  }

  getHighNibble() {
    return (this.byte[0] & 0xf0) >>> 4;
  }

  getLowNibble() {
    return this.byte[0] & 0x0f;
  }

  getHighNibbleAsRegisterIndex() {
    return Math.min(this.getHighNibble(), MAX_REGISTER_INDEX);
  }

  getLowNibbleAsRegisterIndex() {
    return Math.min(this.getLowNibble(), MAX_REGISTER_INDEX);
  }

  getHighNibbleAsLength() {
    return Math.min(this.getHighNibble(), MAX_LENGTH);
  }

  getLowNibbleAsLength() {
    return Math.min(this.getLowNibble(), MAX_LENGTH);
  }
}
