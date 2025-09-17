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
    <div className={"flex justify-between items-center px-2 py-2 bg-title " + classNames}>
      <div className="shrink overflow-hidden text-ellipsis whitespace-nowrap">{startSlot}</div>
      <div className="flex text-xs">
        <button
          className={cs([
            "flex text-secondary-foreground items-center mr-4",
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
              <span className="sm:hidden lg:block">Edit</span>
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
            asm
          </Label>
          <Switch
            id="instruction-mode"
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
            raw
          </Label>
        </div>
      </div>
    </div>
  );
};
