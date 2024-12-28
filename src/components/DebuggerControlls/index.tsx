import { RefreshCcw, Play, StepForward, Pause } from "lucide-react";
import { LoadingSpinner } from "../LoadingSpinner";
import { ProgramLoader } from "../ProgramLoader";
import { Button } from "../ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  continueAllWorkers,
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

      await dispatch(stepAllWorkers()).unwrap();

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
  };

  const handlePauseProgram = async () => {
    dispatch(setIsRunMode(false));
  };

  return (
    <div className="col-span-12 md:col-span-6 max-sm:order-2 flex align-middle max-sm:justify-between mb-3">
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
        onClick={() => {
          debuggerActions.restartProgram(initialState);
          setError(undefined);
        }}
        disabled={!pvmInitialized || isProgramEditMode}
      >
        <RefreshCcw className="w-3.5 md:mr-1.5" />
        <span className="hidden md:block">Reset</span>
      </Button>
      {!isDebugFinished && isRunMode ? (
        <Button className="md:mr-3" onClick={handlePauseProgram}>
          <Pause className="w-3.5 md:mr-1.5" />
          <span className="hidden md:block">Stop</span>
        </Button>
      ) : (
        <Button
          className="md:mr-3"
          onClick={handleRunProgram}
          disabled={isDebugFinished || !pvmInitialized || isProgramEditMode || isLoading || !!error}
        >
          {isLoading ? <LoadingSpinner className="w-3.5 md:mr-1.5" size={20} /> : <Play className="w-3.5 md:mr-1.5" />}
          <span className="hidden md:block">Run</span>
        </Button>
      )}
      <Button
        className="md:mr-3"
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
      {error && <ErrorWarningTooltip msg={error} />}
    </div>
  );
};
