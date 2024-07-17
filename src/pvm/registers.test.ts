import assert from "node:assert";
import { test } from "node:test";
import { Registers } from "./registers";

test("Registers", async (t) => {
	await t.test("loading 0xff_ff_ff_ff into register", () => {
		const registers = new Registers();
		const expectedSignedNumber = -1;
		const expectedUnsignedNumber = 2 ** 32 - 1;

		registers.asUnsigned[0] = 0xff_ff_ff_ff;

		assert.strictEqual(registers.asSigned[0], expectedSignedNumber);
		assert.strictEqual(registers.asUnsigned[0], expectedUnsignedNumber);
	});

	await t.test("loading 0x00_00_00_01 into register", () => {
		const registers = new Registers();
		const expectedSignedNumber = 1;
		const expectedUnsignedNumber = 1;

		registers.asUnsigned[0] = 0x00_00_00_01;

		assert.strictEqual(registers.asSigned[0], expectedSignedNumber);
		assert.strictEqual(registers.asUnsigned[0], expectedUnsignedNumber);
	});

	await t.test("loading 0x80_00_00_00 into register", () => {
		const registers = new Registers();
		const expectedSignedNumber = -(2 ** 31);
		const expectedUnsignedNumber = 2 ** 31;

		registers.asUnsigned[0] = 0x80_00_00_00;

		assert.strictEqual(registers.asSigned[0], expectedSignedNumber);
		assert.strictEqual(registers.asUnsigned[0], expectedUnsignedNumber);
	});
});
