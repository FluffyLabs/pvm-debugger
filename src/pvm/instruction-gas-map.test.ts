import assert from "node:assert";
import { test } from "node:test";
import { Instruction } from "./instruction";
import { instructionGasMap } from "./instruction-gas-map";

test("instructionGasMap", async (t) => {
	const instructions = Object.entries(Instruction).filter(
		(entry): entry is [string, number] =>
			typeof entry[0] === "string" && typeof entry[1] === "number",
	);

	for (const [name, instruction] of instructions) {
		await t.test(
			`checks if instruction ${name} = ${instruction} is correctly mapped to gas value`,
			() => {
				const gasValue = instructionGasMap[instruction];
				assert.notEqual(null, gasValue);
			},
		);
	}
});
