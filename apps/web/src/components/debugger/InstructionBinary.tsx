import type { DecodedInstruction } from "../../hooks/useDisassembly";
import { bytesToHex } from "./value-format";

interface InstructionBinaryProps {
  instruction: DecodedInstruction;
}

export function InstructionBinary({ instruction }: InstructionBinaryProps) {
  return (
    <div
      data-testid="instruction-binary-popover"
      className="font-mono text-xs space-y-1.5"
    >
      <div>
        <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
          Raw Bytes
        </div>
        <div data-testid="popover-raw-bytes">{bytesToHex(instruction.rawBytes)}</div>
      </div>
      <div>
        <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
          Opcode
        </div>
        <div data-testid="popover-opcode">
          {instruction.opcode} (0x
          {instruction.opcode.toString(16).toUpperCase().padStart(2, "0")})
        </div>
      </div>
      <div>
        <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
          Mnemonic
        </div>
        <div>{instruction.mnemonic}</div>
      </div>
      {instruction.args && (
        <div>
          <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
            Arguments
          </div>
          <div>{instruction.args}</div>
        </div>
      )}
    </div>
  );
}
