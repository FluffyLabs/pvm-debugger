import assert from "node:assert";
import { describe, it } from "node:test";
import { Instruction } from "../instruction";
import { instructionArgumentTypeMap } from "./instruction-argument-type-map";

describe("instructionArgumentTypeMap", () => {
  const instructions = Object.entries(Instruction).filter(
    (entry): entry is [string, number] => typeof entry[0] === "string" && typeof entry[1] === "number",
  );

  for (const [name, instruction] of instructions) {
    it(`checks if instruction ${name} = ${instruction} is correctly mapped to arguments type`, () => {
      const argumentsType = instructionArgumentTypeMap[instruction];
      assert.notEqual(null, argumentsType);
    });
  }
});
