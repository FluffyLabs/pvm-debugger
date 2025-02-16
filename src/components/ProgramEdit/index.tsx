import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Pencil, PencilOff } from "lucide-react";
import { setInstructionMode, setIsProgramEditMode } from "@/store/debugger/debuggerSlice.ts";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { InstructionMode } from "../Instructions/types";
import { useDebuggerActions } from "@/hooks/useDebuggerActions";
import classNames from "classnames";

export const ProgramEdit = ({ startSlot }: { startSlot: JSX.Element }) => {
  const dispatch = useAppDispatch();
  const debuggerActions = useDebuggerActions();
  const { program, initialState, isProgramEditMode, isProgramInvalid, instructionMode } = useAppSelector(
    (state) => state.debugger,
  );

  return (
    <div className="flex justify-between items-center px-2 py-3 bg-gray-100">
      <div>{startSlot}</div>
      <div className="flex">
        <button
          className={classNames(["flex items-center mr-3", !program.length ? "invisible" : "visible"])}
          disabled={!program.length || isProgramInvalid}
          title="Edit the code"
          onClick={() => {
            if (isProgramEditMode) {
              debuggerActions.startProgram(initialState, program);
              dispatch(setIsProgramEditMode(false));
            } else {
              debuggerActions.restartProgram(initialState);
              dispatch(setIsProgramEditMode(true));
            }
          }}
        >
          {isProgramEditMode ? (
            <PencilOff size="17px" className="mr-3" />
          ) : (
            <span className="flex">
              <Pencil size="17px" className="mr-1" />
              Edit
            </span>
          )}
        </button>
        <div className={`flex items-center space-x-2 ${!program.length ? "invisible" : "visible"}`}>
          <Label htmlFor="instruction-mode">Asm</Label>
          <Switch
            id="instruction-mode"
            checked={instructionMode === InstructionMode.BYTECODE}
            onCheckedChange={(checked) =>
              dispatch(setInstructionMode(checked ? InstructionMode.BYTECODE : InstructionMode.ASM))
            }
          />
          <Label htmlFor="instruction-mode">Raw</Label>
        </div>
      </div>
    </div>
  );
};
