import assert from "node:assert";
import { test } from "node:test";
import type { TwoRegistersOneOffsetResult } from "../args-decoder/args-decoder";
import { ArgumentType } from "../args-decoder/argument-type";
import { instructionArgumentTypeMap } from "../args-decoder/instruction-argument-type-map";
import { Instruction } from "../instruction";
import { BranchOps } from "../ops";
import { Registers } from "../registers";
import { TwoRegsOneOffsetDispatcher } from "./two-regs-one-offset-dispatcher";

test("TwoRegsOneOffsetDispatcher", async (t) => {
  const regs = new Registers();
  const branchOps = new BranchOps(regs, { pcOffset: 0 });

  const mockFn = t.mock.fn();

  function mockAllMethods(obj: object) {
    const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(obj)) as (keyof typeof obj)[];

    for (const method of methodNames) {
      t.mock.method(obj, method, mockFn);
    }
  }

  t.before(() => {
    mockAllMethods(branchOps);
  });

  t.after(() => {
    t.mock.restoreAll();
  });

  t.beforeEach(() => {
    mockFn.mock.resetCalls();
  });

  const argsMock = {} as TwoRegistersOneOffsetResult;

  const relevantInstructions = Object.entries(Instruction)
    .filter((entry): entry is [string, number] => typeof entry[0] === "string" && typeof entry[1] === "number")
    .filter((entry) => instructionArgumentTypeMap[entry[1]] === ArgumentType.TWO_REGISTERS_ONE_OFFSET);

  for (const [name, instruction] of relevantInstructions) {
    await t.test(`checks if instruction ${name} = ${instruction} is handled by TwoRegsOneOffsetDispatcher`, () => {
      const dispatcher = new TwoRegsOneOffsetDispatcher(branchOps);

      dispatcher.dispatch(instruction, argsMock);

      assert.strictEqual(mockFn.mock.calls.length, 1);
    });
  }

  const otherInstructions = Object.entries(Instruction)
    .filter((entry): entry is [string, number] => typeof entry[0] === "string" && typeof entry[1] === "number")
    .filter((entry) => instructionArgumentTypeMap[entry[1]] !== ArgumentType.TWO_REGISTERS_ONE_OFFSET);

  for (const [name, instruction] of otherInstructions) {
    await t.test(`checks if instruction ${name} = ${instruction} is not handled by TwoRegsOneOffsetDispatcher`, () => {
      const dispatcher = new TwoRegsOneOffsetDispatcher(branchOps);

      dispatcher.dispatch(instruction, argsMock);

      assert.strictEqual(mockFn.mock.calls.length, 0);
    });
  }
});
