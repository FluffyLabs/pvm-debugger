import { RefreshCcw, Play, StepForward, SkipForward, Pause } from "lucide-react";
import { LoadingSpinner } from "../LoadingSpinner";
import { ProgramLoader } from "../ProgramLoader";
import { Button } from "../ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  continueAllWorkers,
  refreshMemoryRangeAllWorkers,
  refreshPageAllWorkers,
  runAllWorkers,
  selectIsAnyWorkerLoading,
  setAllWorkersCurrentState,
  stepAllWorkers,
} from "@/store/workers/workersSlice";
import { setIsProgramEditMode, setIsRunMode } from "@/store/debugger/debuggerSlice";
import { useDebuggerActions } from "@/hooks/useDebuggerActions";
import { useState } from "react";
import { ErrorWarningTooltip } from "../ErrorWarningTooltip";
import { isSerializedError } from "@/store/utils";
import { Separator } from "../ui/separator";

export const DebuggerControlls = () => {
  const debuggerActions = useDebuggerActions();
  const [error, setError] = useState<string>();
  const { program, initialState, isProgramEditMode, isDebugFinished, pvmInitialized, isRunMode, programPreviewResult } =
    useAppSelector((state) => state.debugger);

  const workers = useAppSelector((state) => state.workers);
  const isLoading = useAppSelector(selectIsAnyWorkerLoading);
  const dispatch = useAppDispatch();

  const currentInstruction = programPreviewResult.find((x) => x.address === workers[0]?.currentPc);

  const calculateStepsToExitBlock = (): number => {
    if (!currentInstruction || !programPreviewResult) {
      return 1;
    }

    // If we're already at the end of a block, step once
    if (currentInstruction.block.isEnd) {
      return 1;
    }

    // Find the current instruction in the program preview result
    const currentIndex = programPreviewResult.findIndex((inst) => inst.address === currentInstruction.address);
    if (currentIndex === -1) {
      return 1;
    }

    // Count instructions remaining in the current block
    let stepsInBlock = 1; // Count the step from current instruction

    for (let i = currentIndex + 1; i < programPreviewResult.length; i++) {
      const instruction = programPreviewResult[i];

      // If we encounter a different block or the end of current block, stop counting
      if (instruction.block.number !== currentInstruction.block.number) {
        break;
      }

      stepsInBlock++;

      // If this instruction is the end of the block, we're done
      if (instruction.block.isEnd) {
        break;
      }
    }

    return stepsInBlock;
  };

  const onNext = async () => {
    if (!workers.length) {
      setError("No workers initialized");
      return;
    }

    try {
      if (!currentInstruction) {
        dispatch(setAllWorkersCurrentState(initialState));
      }

      // NOTE [ToDr] Despite settings "batched steps", when
      // the user clicks "Step" we want just single step to happen.
      await dispatch(stepAllWorkers({ stepsToPerform: 1 })).unwrap();
      dispatch(setIsProgramEditMode(false));
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message);
      } else {
        setError("Unknown error occured");
      }
    }
  };

  const onStepOverBlock = async () => {
    if (!workers.length) {
      setError("No workers initialized");
      return;
    }

    try {
      if (!currentInstruction) {
        // perform the initial step
        await onNext();
        return;
      }

      const stepsToPerform = calculateStepsToExitBlock();
      await dispatch(stepAllWorkers({ stepsToPerform })).unwrap();
      dispatch(setIsProgramEditMode(false));
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message);
      } else {
        setError("Unknown error occured");
      }
    }
  };

  const handleRunProgram = async () => {
    if (!workers.length) {
      setError("No workers initialized");
      return;
    }

    try {
      if (isRunMode) {
        await dispatch(continueAllWorkers()).unwrap();
      } else {
        dispatch(setIsRunMode(true));
        await dispatch(runAllWorkers()).unwrap();
      }
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message);
      } else {
        setError("Unknown error occured");
      }
    }

    await dispatch(refreshPageAllWorkers()).unwrap();
    await dispatch(refreshMemoryRangeAllWorkers()).unwrap();
  };

  const handlePauseProgram = async () => {
    dispatch(setIsRunMode(false));
  };

  return (
    <div className="flex align-middle h-full max-sm:justify-between bg-secondary p-2 w-full">
      <div className="md:mr-3">
        <ProgramLoader
          initialState={initialState}
          program={program}
          onOpen={() => {
            setError(undefined);
          }}
        />
      </div>
      <Button
        className="md:mr-3"
        variant="secondary"
        onClick={() => {
          debuggerActions.restartProgram(initialState);
          setError(undefined);
        }}
        disabled={!pvmInitialized || isProgramEditMode}
      >
        <RefreshCcw className="w-3.5 md:mr-1.5" />
        <span className="hidden md:block">Reset</span>
      </Button>
      <Separator className="h-[36px] sm:h-full" orientation="vertical" />
      {!isDebugFinished && isRunMode ? (
        <Button className="md:mr-3" variant="ghost" onClick={handlePauseProgram}>
          <Pause className="w-3.5 md:mr-1.5" />
          <span className="hidden md:block">Stop</span>
        </Button>
      ) : (
        <Button
          className="md:mr-3"
          variant="secondary"
          onClick={handleRunProgram}
          disabled={isDebugFinished || !pvmInitialized || isProgramEditMode || isLoading || !!error}
        >
          {isLoading ? <LoadingSpinner className="w-3.5 md:mr-1.5" size={20} /> : <Play className="w-3.5 md:mr-1.5" />}
          <span className="hidden md:block">Run</span>
        </Button>
      )}
      <Button
        className="md:mr-3"
        variant="secondary"
        onClick={onNext}
        disabled={
          (!isDebugFinished && isRunMode) ||
          isDebugFinished ||
          !pvmInitialized ||
          isProgramEditMode ||
          isLoading ||
          !!error
        }
      >
        {isLoading ? (
          <LoadingSpinner className="w-3.5 md:mr-1.5" size={20} />
        ) : (
          <StepForward className="w-3.5 md:mr-1.5" />
        )}
        <span className="hidden md:block">Step</span>
      </Button>
      <Button
        className="md:mr-3"
        variant="secondary"
        onClick={onStepOverBlock}
        disabled={
          (!isDebugFinished && isRunMode) ||
          isDebugFinished ||
          !pvmInitialized ||
          isProgramEditMode ||
          isLoading ||
          !!error
        }
      >
        {isLoading ? (
          <LoadingSpinner className="w-3.5 md:mr-1.5" size={20} />
        ) : (
          <SkipForward className="w-3.5 md:mr-1.5" />
        )}
        <span className="hidden md:block">Block</span>
      </Button>
      {/* TODO fix dark mode */}
      {error && <ErrorWarningTooltip classNames="m-2" variant="light" msg={error} />}
    </div>
  );
};
