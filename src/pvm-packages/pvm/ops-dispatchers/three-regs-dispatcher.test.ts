import assert from "node:assert";
import { test } from "node:test";
import type { ThreeRegistersResult } from "../args-decoder/args-decoder";
import { ArgumentType } from "../args-decoder/argument-type";
import { instructionArgumentTypeMap } from "../args-decoder/instruction-argument-type-map";
import { Instruction } from "../instruction";
import { BitOps, BooleanOps, MathOps, MoveOps, ShiftOps } from "../ops";
import { Registers } from "../registers";
import { ThreeRegsDispatcher } from "./three-regs-dispatcher";

test("ThreeRegsDispatcher", async (t) => {
  const regs = new Registers();
  const mathOps = new MathOps(regs);
  const bitOps = new BitOps(regs);
  const shiftOps = new ShiftOps(regs);
  const booleanOps = new BooleanOps(regs);
  const moveOps = new MoveOps(regs);

  const mockFn = t.mock.fn();

  function mockAllMethods(obj: object) {
    const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(obj)) as (keyof typeof obj)[];

    for (const method of methodNames) {
      t.mock.method(obj, method, mockFn);
    }
  }

  t.before(() => {
    mockAllMethods(bitOps);
    mockAllMethods(booleanOps);
    mockAllMethods(moveOps);
    mockAllMethods(mathOps);
    mockAllMethods(bitOps);
    mockAllMethods(shiftOps);
  });

  t.after(() => {
    t.mock.restoreAll();
  });

  t.beforeEach(() => {
    mockFn.mock.resetCalls();
  });

  const threeRegsInstructions = Object.entries(Instruction)
    .filter((entry): entry is [string, number] => typeof entry[0] === "string" && typeof entry[1] === "number")
    .filter((entry) => instructionArgumentTypeMap[entry[1]] === ArgumentType.THREE_REGISTERS);

  for (const [name, instruction] of threeRegsInstructions) {
    await t.test(`checks if instruction ${name} = ${instruction} is handled by ThreeRegsDispatcher`, () => {
      const threeRegsDispatcher = new ThreeRegsDispatcher(mathOps, shiftOps, bitOps, booleanOps, moveOps);

      threeRegsDispatcher.dispatch(instruction, {} as ThreeRegistersResult);

      assert.strictEqual(mockFn.mock.calls.length, 1);
    });
  }

  const otherInstructions = Object.entries(Instruction)
    .filter((entry): entry is [string, number] => typeof entry[0] === "string" && typeof entry[1] === "number")
    .filter((entry) => instructionArgumentTypeMap[entry[1]] !== ArgumentType.THREE_REGISTERS);

  for (const [name, instruction] of otherInstructions) {
    await t.test(`checks if instruction ${name} = ${instruction} is not handled by ThreeRegsDispatcher`, () => {
      const threeRegsDispatcher = new ThreeRegsDispatcher(mathOps, shiftOps, bitOps, booleanOps, moveOps);

      threeRegsDispatcher.dispatch(instruction, {} as ThreeRegistersResult);

      assert.strictEqual(mockFn.mock.calls.length, 0);
    });
  }
});
