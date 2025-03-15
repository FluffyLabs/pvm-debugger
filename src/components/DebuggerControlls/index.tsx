import { RefreshCcw, Play, StepForward, Pause } from "lucide-react";
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
  const { program, initialState, isProgramEditMode, isDebugFinished, pvmInitialized, isRunMode } = useAppSelector(
    (state) => state.debugger,
  );

  const workers = useAppSelector((state) => state.workers);
  const isLoading = useAppSelector(selectIsAnyWorkerLoading);
  const dispatch = useAppDispatch();

  const { currentInstruction } = workers[0] || {
    currentInstruction: null,
    currentState: initialState,
    previousState: initialState,
  };

  const onNext = async () => {
    if (!workers.length) {
      setError("No workers initialized");
      return;
    }

    try {
      if (!currentInstruction) {
        await dispatch(setAllWorkersCurrentState(initialState));
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
      {/* TODO fix dark mode */}
      {error && <ErrorWarningTooltip variant="light" msg={error} />}
    </div>
  );
};
