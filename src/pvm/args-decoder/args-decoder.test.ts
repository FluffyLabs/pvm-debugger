import assert from "node:assert";
import { test } from "node:test";
import { Instruction } from "../instruction";
import { ArgsDecoder } from "./args-decoder";
import { ImmediateDecoder } from "./decoders/immediate-decoder";

test("ArgsDecoder", async (t) => {
	await t.test("return empty result for instruction without args", () => {
		const code = [Instruction.TRAP];
		const mask = [0b1111_1111];
		const argsDecoder = new ArgsDecoder(code, mask);
		const expectedResult = {
			noOfInstructionsToSkip: code.length,

			firstRegisterIndex: null,
			secondRegisterIndex: null,
			thirdRegisterIndex: null,

			immediateDecoder1: null,
			immediateDecoder2: null,

			offset: null,
		};

		const result = argsDecoder.getArgs(0);

		assert.deepStrictEqual(result, expectedResult);
	});

	await t.test("return correct result for instruction with 3 regs", () => {
		const code = [Instruction.ADD, 0x12, 0x03];
		const mask = [0b1111_1001];
		const argsDecoder = new ArgsDecoder(code, mask);
		const expectedResult = {
			noOfInstructionsToSkip: code.length,

			firstRegisterIndex: 1,
			secondRegisterIndex: 2,
			thirdRegisterIndex: 3,

			immediateDecoder1: null,
			immediateDecoder2: null,

			offset: null,
		};

		const result = argsDecoder.getArgs(0);

		assert.deepStrictEqual(result, expectedResult);
	});

	await t.test(
		"return correct result for instruction with 2 regs and 1 immediate",
		() => {
			const code = [Instruction.ADD_IMM, 0x12, 0xff];
			const mask = [0b1111_1001];
			const argsDecoder = new ArgsDecoder(code, mask);
			const expectedImmediateDecoder = new ImmediateDecoder();
			expectedImmediateDecoder.setBytes(new Uint8Array([0xff]));
			const expectedResult = {
				noOfInstructionsToSkip: code.length,

				firstRegisterIndex: 1,
				secondRegisterIndex: 2,
				thirdRegisterIndex: null,

				immediateDecoder1: expectedImmediateDecoder,
				immediateDecoder2: null,

				offset: null,
			};

			const result = argsDecoder.getArgs(0);

			assert.deepStrictEqual(result, expectedResult);
		},
	);
});
