import { InstructionMode } from "@/components/Instructions/types";
import { CurrentInstruction, ExpectedState, Status } from "@/types/pvm";
import { InstructionsTable, ProgramRow } from "./InstructionsTable";
import { ProgramEdit } from "../ProgramEdit";

export interface InstructionsProps {
  status?: Status;
  programPreviewResult?: CurrentInstruction[];
  currentState: ExpectedState;
  instructionMode: InstructionMode;
  onInstructionClick: (row: ProgramRow) => void;
  onAddressClick: (address: number) => void;
  breakpointAddresses: (number | undefined)[];
}

export const Instructions = (props: InstructionsProps) => {
  return (
    <div className="border-2 rounded-md">
      <ProgramEdit startSlot={<></>} />
      <InstructionsTable {...props} />
    </div>
  );
};
