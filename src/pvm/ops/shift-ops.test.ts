import assert from "node:assert";
import { test } from "node:test";

import { Registers } from "../registers";
import { ShiftOps } from "./shift-ops";

const FIRST_REGISTER = 0;
const SECOND_REGISTER = 1;
const RESULT_REGISTER = 12;

const getRegisters = (data: number[]) => {
	const regs = new Registers();

	for (const [i, byte] of data.entries()) {
		regs.asUnsigned[i] = byte;
	}

	return regs;
};

test("ShiftOps", async (t) => {
	await t.test("shiftLogicalLeft", () => {
		const firstValue = 3;
		const secondValue = 0b0001;
		const resultValue = 0b1000;
		const regs = getRegisters([firstValue, secondValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalLeft(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalLeft with arg overflow", () => {
		const firstValue = 35;
		const secondValue = 0b0001;
		const resultValue = 0b1000;
		const regs = getRegisters([firstValue, secondValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalLeft(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalLeft with result overflow", () => {
		const firstValue = 3;
		const secondValue = 0xa0_00_00_00;
		const resultValue = 0;
		const regs = getRegisters([firstValue, secondValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalLeft(FIRST_REGISTER, SECOND_REGISTER, RESULT_REGISTER);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalLeftImmediateAlternative", () => {
		const firstValue = 3;
		const secondValue = 0b0001;
		const resultValue = 0b1000;
		const regs = getRegisters([firstValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalLeftImmediateAlternative(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalLeftImmediateAlternative with arg overflow", () => {
		const firstValue = 35;
		const secondValue = 0b0001;
		const resultValue = 0b1000;
		const regs = getRegisters([firstValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalLeftImmediateAlternative(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test(
		"shiftLogicalLeftImmediateAlternative with result overflow",
		() => {
			const firstValue = 3;
			const secondValue = 0xa0_00_00_00;
			const resultValue = 0;
			const regs = getRegisters([firstValue]);
			const shiftOps = new ShiftOps(regs);

			shiftOps.shiftLogicalLeftImmediateAlternative(
				FIRST_REGISTER,
				secondValue,
				RESULT_REGISTER,
			);

			assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
		},
	);

	await t.test("shiftLogicalLeftImmediate", () => {
		const firstValue = 0b0001;
		const secondValue = 3;
		const resultValue = 0b1000;
		const regs = getRegisters([firstValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalLeftImmediate(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalLeftImmediate with arg overflow", () => {
		const firstValue = 0b0001;
		const secondValue = 35;
		const resultValue = 0b1000;
		const regs = getRegisters([firstValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalLeftImmediate(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalLeftImmediate with result overflow", () => {
		const firstValue = 0xa0_00_00_00;
		const secondValue = 3;
		const resultValue = 0;
		const regs = getRegisters([firstValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalLeftImmediate(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalRight", () => {
		const firstValue = 3;
		const secondValue = 0b10000;
		const resultValue = 0b00010;
		const regs = getRegisters([firstValue, secondValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalRight(
			FIRST_REGISTER,
			SECOND_REGISTER,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalRight with arg overflow", () => {
		const firstValue = 35;
		const secondValue = 0b10000;
		const resultValue = 0b00010;
		const regs = getRegisters([firstValue, secondValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalRight(
			FIRST_REGISTER,
			SECOND_REGISTER,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalRightImmediateAlternative", () => {
		const firstValue = 3;
		const secondValue = 0b10000;
		const resultValue = 0b00010;
		const regs = getRegisters([firstValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalRightImmediateAlternative(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalLeftImmediateAlternative with arg overflow", () => {
		const firstValue = 35;
		const secondValue = 0b10000;
		const resultValue = 0b00010;
		const regs = getRegisters([firstValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalRightImmediateAlternative(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalRightImmediate", () => {
		const firstValue = 0b10000;
		const secondValue = 3;
		const resultValue = 0b00010;
		const regs = getRegisters([firstValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalRightImmediate(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftLogicalRightImmediate with arg overflow", () => {
		const firstValue = 0b10000;
		const secondValue = 35;
		const resultValue = 0b00010;
		const regs = getRegisters([firstValue]);
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftLogicalRightImmediate(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asUnsigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftArithmeticRight (positive number)", () => {
		const firstValue = 3;
		const secondValue = 0b10000;
		const resultValue = 0b00010;
		const regs = new Registers();
		regs.asUnsigned[FIRST_REGISTER] = firstValue;
		regs.asSigned[SECOND_REGISTER] = secondValue;
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftArithmeticRight(
			FIRST_REGISTER,
			SECOND_REGISTER,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftArithmeticRight (negative number)", () => {
		const firstValue = 3;
		const secondValue = 0xff_ff_ff_f8; // -8
		const resultValue = 0xff_ff_ff_ff | 0; // -1
		const regs = new Registers();
		regs.asUnsigned[FIRST_REGISTER] = firstValue;
		regs.asSigned[SECOND_REGISTER] = secondValue;
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftArithmeticRight(
			FIRST_REGISTER,
			SECOND_REGISTER,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftArithmeticRight with arg overflow", () => {
		const firstValue = 35;
		const secondValue = 0b10000;
		const resultValue = 0b00010;
		const regs = new Registers();
		regs.asUnsigned[FIRST_REGISTER] = firstValue;
		regs.asSigned[SECOND_REGISTER] = secondValue;
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftArithmeticRight(
			FIRST_REGISTER,
			SECOND_REGISTER,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
	});

	await t.test(
		"shiftArithmeticRightImmediateAlternative (positive number)",
		() => {
			const firstValue = 3;
			const secondValue = 0b10000;
			const resultValue = 0b00010;
			const regs = new Registers();
			regs.asUnsigned[FIRST_REGISTER] = firstValue;
			const shiftOps = new ShiftOps(regs);

			shiftOps.shiftArithmeticRightImmediateAlternative(
				FIRST_REGISTER,
				secondValue,
				RESULT_REGISTER,
			);

			assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
		},
	);

	await t.test(
		"shiftArithmeticRightImmediateAlternative (negative number)",
		() => {
			const firstValue = 3;
			const secondValue = 0xff_ff_ff_f8; // -8
			const resultValue = 0xff_ff_ff_ff | 0; // -1
			const regs = new Registers();
			regs.asUnsigned[FIRST_REGISTER] = firstValue;
			const shiftOps = new ShiftOps(regs);

			shiftOps.shiftArithmeticRightImmediateAlternative(
				FIRST_REGISTER,
				secondValue,
				RESULT_REGISTER,
			);

			assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
		},
	);

	await t.test(
		"shiftArithmeticRightImmediateAlternative with arg overflow",
		() => {
			const firstValue = 35;
			const secondValue = 0b10000;
			const resultValue = 0b00010;
			const regs = new Registers();
			regs.asUnsigned[FIRST_REGISTER] = firstValue;
			const shiftOps = new ShiftOps(regs);

			shiftOps.shiftArithmeticRightImmediateAlternative(
				FIRST_REGISTER,
				secondValue,
				RESULT_REGISTER,
			);

			assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
		},
	);

	await t.test("shiftArithmeticRightImmediate (positive number)", () => {
		const firstValue = 0b10000;
		const secondValue = 3;
		const resultValue = 0b00010;
		const regs = new Registers();
		regs.asUnsigned[FIRST_REGISTER] = firstValue;
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftArithmeticRightImmediate(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftArithmeticRightImmediate (negative number)", () => {
		const firstValue = 0xff_ff_ff_f8; // -8
		const secondValue = 3;
		const resultValue = 0xff_ff_ff_ff | 0; // -1
		const regs = new Registers();
		regs.asUnsigned[FIRST_REGISTER] = firstValue;
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftArithmeticRightImmediate(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
	});

	await t.test("shiftArithmeticRightImmediate with arg overflow", () => {
		const firstValue = 0b10000;
		const secondValue = 35;
		const resultValue = 0b00010;
		const regs = new Registers();
		regs.asUnsigned[FIRST_REGISTER] = firstValue;
		const shiftOps = new ShiftOps(regs);

		shiftOps.shiftArithmeticRightImmediate(
			FIRST_REGISTER,
			secondValue,
			RESULT_REGISTER,
		);

		assert.strictEqual(regs.asSigned[RESULT_REGISTER], resultValue);
	});
});
