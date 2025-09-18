import { useState } from "react";
import { InstructionMode } from "@/components/Instructions/types";
import { CurrentInstruction, ExpectedState, Status } from "@/types/pvm";
import { InstructionsTable, ProgramRow } from "./InstructionsTable";
import { CollapsibleInstructionsTable } from "./BasicBlocks/CollapsibleInstructionsTable";
import { ProgramEdit } from "../ProgramEdit";
import { Layers, List } from "lucide-react";

export interface InstructionsProps {
  programName: string;
  status?: Status;
  programPreviewResult?: CurrentInstruction[];
  currentState: ExpectedState;
  instructionMode: InstructionMode;
  onInstructionClick: (row: ProgramRow) => void;
  onAddressClick: (address: number) => void;
  breakpointAddresses: (number | undefined)[];
}

export const Instructions = (props: InstructionsProps) => {
  const [useBlockView, setUseBlockView] = useState(true);

  return (
    <div className="border-[1px] rounded-md bg-card h-full flex flex-col overflow-hidden font-inconsolata">
      <ProgramEdit
        classNames="rounded-ss rounded-se font-poppins"
        startSlot={
          <div className="flex items-center gap-2">
            <div className="shrink overflow-hidden text-ellipsis text-xs whitespace-nowrap">{props.programName}</div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setUseBlockView(false)}
                className={`p-1 rounded transition-colors ${!useBlockView ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setUseBlockView(true)}
                className={`p-1 rounded transition-colors ${useBlockView ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Block view"
              >
                <Layers className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      />
      {useBlockView ? <CollapsibleInstructionsTable {...props} /> : <InstructionsTable {...props} />}
    </div>
  );
};
