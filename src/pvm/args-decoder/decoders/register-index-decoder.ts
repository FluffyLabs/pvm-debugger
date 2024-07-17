import { NO_OF_REGISTERS } from "../../registers";

const MAX_REGISTER_INDEX = NO_OF_REGISTERS - 1;

export class RegisterIndexDecoder {
	private byte = new Int8Array(1);

	setByte(byte: number) {
		this.byte[0] = byte;
	}

	getFirstIndex() {
		return Math.min((this.byte[0] & 0xf0) >> 4, MAX_REGISTER_INDEX);
	}

	getSecondIndex() {
		return Math.min(this.byte[0] & 0x0f, MAX_REGISTER_INDEX);
	}
}
