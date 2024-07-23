import type { ThreeRegistersResult } from "../args-decoder/args-decoder";
import { Instruction } from "../instruction";
import type { BitOps, BooleanOps, MathOps, MoveOps, ShiftOps } from "../ops";

export class ThreeRegsDispatcher {
  constructor(
    private mathOps: MathOps,
    private shiftOps: ShiftOps,
    private bitOps: BitOps,
    private booleanOps: BooleanOps,
    private moveOps: MoveOps,
  ) {}

  dispatch(instruction: Instruction, args: ThreeRegistersResult) {
    switch (instruction) {
      case Instruction.ADD:
        this.mathOps.add(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.MUL:
        this.mathOps.mul(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.MUL_UPPER_U_U:
        this.mathOps.mulUpperUU(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.MUL_UPPER_S_S:
        this.mathOps.mulUpperSS(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.MUL_UPPER_S_U:
        this.mathOps.mulUpperSU(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.SUB:
        this.mathOps.sub(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.DIV_S:
        this.mathOps.divSigned(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.DIV_U:
        this.mathOps.divUnsigned(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.REM_S:
        this.mathOps.remSigned(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.REM_U:
        this.mathOps.remUnsigned(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.SHLO_L:
        this.shiftOps.shiftLogicalLeft(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.SHLO_R:
        this.shiftOps.shiftLogicalRight(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.SHAR_R:
        this.shiftOps.shiftArithmeticRight(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.OR:
        this.bitOps.or(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.AND:
        this.bitOps.and(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.XOR:
        this.bitOps.xor(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.SET_LT_S:
        this.booleanOps.setLessThanSigned(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.SET_LT_U:
        this.booleanOps.setLessThanUnsigned(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;

      case Instruction.CMOV_IZ:
        this.moveOps.cmovIfZero(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;
      case Instruction.CMOV_NZ:
        this.moveOps.cmovIfNotZero(args.firstRegisterIndex, args.secondRegisterIndex, args.thirdRegisterIndex);
        break;
    }
  }
}
