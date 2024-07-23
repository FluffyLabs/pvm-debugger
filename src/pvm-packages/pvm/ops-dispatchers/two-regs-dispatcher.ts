import type { TwoRegistersResult } from "../args-decoder/args-decoder";
import { Instruction } from "../instruction";
import type { MoveOps } from "../ops";

export class TwoRegsDispatcher {
  constructor(private moveOps: MoveOps) {}

  dispatch(instruction: Instruction, args: TwoRegistersResult) {
    switch (instruction) {
      case Instruction.MOVE_REG: {
        this.moveOps.moveRegister(args.firstRegisterIndex, args.secondRegisterIndex);
        break;
      }
    }
  }
}
