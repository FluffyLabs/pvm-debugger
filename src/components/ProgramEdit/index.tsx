import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Pencil, PencilOff } from "lucide-react";
import { setInstructionMode, setIsProgramEditMode } from "@/store/debugger/debuggerSlice.ts";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { InstructionMode } from "../Instructions/types";
import { useDebuggerActions } from "@/hooks/useDebuggerActions";
import cs from "classnames";

export const ProgramEdit = ({ startSlot, classNames }: { startSlot: JSX.Element; classNames?: string }) => {
  const dispatch = useAppDispatch();
  const debuggerActions = useDebuggerActions();
  const { program, programName, initialState, isProgramEditMode, isProgramInvalid, instructionMode } = useAppSelector(
    (state) => state.debugger,
  );

  return (
    <div className={"flex justify-between items-center px-2 py-3 bg-title " + classNames}>
      <div>{startSlot}</div>
      <div className="flex text-xs">
        <button
          className={cs([
            "flex text-secondary-foreground items-center mr-6",
            !program.length ? "invisible" : "visible",
          ])}
          disabled={!program.length || isProgramInvalid}
          title="Edit the code"
          onClick={() => {
            if (isProgramEditMode) {
              debuggerActions.startProgram(initialState, program, programName);
              dispatch(setIsProgramEditMode(false));
            } else {
              debuggerActions.restartProgram(initialState);
              dispatch(setIsProgramEditMode(true));
            }
          }}
        >
          {isProgramEditMode ? (
            <PencilOff height={15} />
          ) : (
            <span className="flex items-center">
              <Pencil height={15} />
              Edit
            </span>
          )}
        </button>
        <div className={`flex items-center space-x-2 ${!program.length ? "invisible" : "visible"}`}>
          <Label
            className={cs(
              "text-xs",
              instructionMode === InstructionMode.BYTECODE ? "text-title-foreground" : "text-secondary-foreground",
            )}
            htmlFor="instruction-mode"
          >
            Asm
          </Label>
          <Switch
            id="instruction-mode"
            className="text-foreground"
            checked={instructionMode === InstructionMode.BYTECODE}
            onCheckedChange={(checked) =>
              dispatch(setInstructionMode(checked ? InstructionMode.BYTECODE : InstructionMode.ASM))
            }
            variant="secondary"
          />
          <Label
            className={cs(
              "text-xs",
              instructionMode === InstructionMode.BYTECODE ? "text-secondary-foreground" : "text-title-foreground",
            )}
            htmlFor="instruction-mode"
          >
            Raw
          </Label>
        </div>
      </div>
    </div>
  );
};
