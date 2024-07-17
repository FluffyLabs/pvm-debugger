import { byteToOpCodeMap } from "./assemblify";
import { HIGHEST_INSTRUCTION_NUMBER } from "./instruction";

export const instructionGasMap = new Array<number>(
	HIGHEST_INSTRUCTION_NUMBER + 1,
);

for (let i = 0; i < HIGHEST_INSTRUCTION_NUMBER + 1; i++) {
	const gas = byteToOpCodeMap[i]?.gas;
	instructionGasMap[i] = gas;
}
