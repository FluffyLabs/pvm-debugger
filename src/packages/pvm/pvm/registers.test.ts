import assert from "node:assert";
import { describe, it } from "node:test";
import { Registers } from "./registers";

describe("Registers", () => {
  describe("loading values", () => {
    it("should return 0xff_ff_ff_ff correctly loaded into register", () => {
      const registers = new Registers();
      const expectedSignedNumber = -1;
      const expectedUnsignedNumber = 2 ** 32 - 1;

      registers.asUnsigned[0] = 0xff_ff_ff_ff;

      assert.strictEqual(registers.asSigned[0], expectedSignedNumber);
      assert.strictEqual(registers.asUnsigned[0], expectedUnsignedNumber);
    });

    it("should return 0x00_00_00_01 correctly loaded into register", () => {
      const registers = new Registers();
      const expectedSignedNumber = 1;
      const expectedUnsignedNumber = 1;

      registers.asUnsigned[0] = 0x00_00_00_01;

      assert.strictEqual(registers.asSigned[0], expectedSignedNumber);
      assert.strictEqual(registers.asUnsigned[0], expectedUnsignedNumber);
    });

    it("should return 0x80_00_00_00 correctly loaded into register", () => {
      const registers = new Registers();
      const expectedSignedNumber = -(2 ** 31);
      const expectedUnsignedNumber = 2 ** 31;

      registers.asUnsigned[0] = 0x80_00_00_00;

      assert.strictEqual(registers.asSigned[0], expectedSignedNumber);
      assert.strictEqual(registers.asUnsigned[0], expectedUnsignedNumber);
    });
  });

  describe("getBytesAsLittleEndian", () => {
    it("should return empty bytes array", () => {
      const regs = new Registers();

      const num = 0;
      const expectedBytes = new Uint8Array([0, 0, 0, 0]);

      regs.asUnsigned[1] = num;

      assert.deepStrictEqual(regs.getBytesAsLittleEndian(1), expectedBytes);
    });

    it("should return u8 number correctly encoded as little endian", () => {
      const regs = new Registers();

      const num = 0xff;
      const expectedBytes = new Uint8Array([0xff, 0, 0, 0]);

      regs.asUnsigned[1] = num;

      assert.deepStrictEqual(regs.getBytesAsLittleEndian(1), expectedBytes);
    });

    it("should return u16 number correctly encoded as little endian", () => {
      const regs = new Registers();

      const num = 0xff_ee;
      const expectedBytes = new Uint8Array([0xee, 0xff, 0, 0]);

      regs.asUnsigned[1] = num;

      assert.deepStrictEqual(regs.getBytesAsLittleEndian(1), expectedBytes);
    });

    it("should return u32 number correctly encoded as little endian", () => {
      const regs = new Registers();

      const num = 0xff_ee_dd_cc;
      const expectedBytes = new Uint8Array([0xcc, 0xdd, 0xee, 0xff]);

      regs.asUnsigned[1] = num;

      assert.deepStrictEqual(regs.getBytesAsLittleEndian(1), expectedBytes);
    });
  });

  describe("setFromBytes", () => {
    it("should write [0xff] into register", () => {
      const regs = new Registers();
      const registerIndex = 0;
      const bytes = new Uint8Array([0xff]);

      regs.setFromBytes(registerIndex, bytes);

      assert.strictEqual(regs.asUnsigned[registerIndex], 0xff);
      assert.strictEqual(regs.asSigned[registerIndex], 0xff);
    });

    it("should write [0xff, 0xee] into register", () => {
      const regs = new Registers();
      const registerIndex = 0;
      const bytes = new Uint8Array([0xff, 0xee]);

      regs.setFromBytes(registerIndex, bytes);

      assert.strictEqual(regs.asUnsigned[registerIndex], 0xee_ff);
      assert.strictEqual(regs.asSigned[registerIndex], 0xee_ff);
    });

    it("should write [0xff, 0xee] into register", () => {
      const regs = new Registers();
      const registerIndex = 0;
      const bytes = new Uint8Array([0xff, 0xee, 0xdd, 0xcc]);

      regs.setFromBytes(registerIndex, bytes);

      assert.strictEqual(regs.asUnsigned[registerIndex], 0xcc_dd_ee_ff);
      assert.strictEqual(regs.asSigned[registerIndex], -857870593);
    });
  });
});
