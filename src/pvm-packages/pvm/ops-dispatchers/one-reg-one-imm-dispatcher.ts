import type { OneRegisterOneImmediateResult } from "../args-decoder/args-decoder";
import { Instruction } from "../instruction";
import type { LoadOps } from "../ops";

export class OneRegisterOneImmediateDispatcher {
  constructor(private loadOps: LoadOps) {}

  dispatch(instruction: Instruction, args: OneRegisterOneImmediateResult) {
    switch (instruction) {
      case Instruction.LOAD_IMM:
        this.loadOps.loadImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned());
        break;
    }
  }
}
