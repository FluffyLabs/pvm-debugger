import { RefreshCcw, Play, StepForward } from "lucide-react";
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

export const DebuggerControlls = () => {
  const debuggerActions = useDebuggerActions();
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

  const onNext = () => {
    if (!workers.length) {
      console.warn("No workers initialized"); // TODO: show error message
      return;
    }

    if (!currentInstruction) {
      dispatch(setAllWorkersCurrentState(initialState));
    } else {
      dispatch(stepAllWorkers());
    }

    dispatch(setIsProgramEditMode(false));
    dispatch(refreshPageAllWorkers());
  };

  const handleRunProgram = () => {
    if (!workers.length) {
      console.warn("No workers initialized"); // TODO: show error message
      return;
    }

    if (isRunMode) {
      dispatch(continueAllWorkers());
    } else {
      // debuggerActions.startProgram(initialState, program);
      dispatch(setIsRunMode(true));
      dispatch(runAllWorkers());
    }
    dispatch(refreshPageAllWorkers());
    // dispatch(stepAllWorkers());
  };

  return (
    <div className="col-span-12 md:col-span-6 max-sm:order-2 flex align-middle max-sm:justify-between mb-3">
      <div className="md:mr-3">
        <ProgramLoader initialState={initialState} program={program} />
      </div>
      <Button
        className="md:mr-3"
        onClick={() => {
          debuggerActions.restartProgram(initialState);
        }}
        disabled={!pvmInitialized || isProgramEditMode}
      >
        <RefreshCcw className="w-3.5 md:mr-1.5" />
        <span className="hidden md:block">Reset</span>
      </Button>
      <Button
        className="md:mr-3"
        onClick={handleRunProgram}
        disabled={isDebugFinished || !pvmInitialized || isProgramEditMode || isLoading}
      >
        {isLoading ? <LoadingSpinner className="w-3.5 md:mr-1.5" size={20} /> : <Play className="w-3.5 md:mr-1.5" />}
        <span className="hidden md:block">Run</span>
      </Button>
      <Button
        className="md:mr-3"
        onClick={onNext}
        disabled={isDebugFinished || !pvmInitialized || isProgramEditMode || isLoading}
      >
        {isLoading ? (
          <LoadingSpinner className="w-3.5 md:mr-1.5" size={20} />
        ) : (
          <StepForward className="w-3.5 md:mr-1.5" />
        )}
        <span className="hidden md:block">Step</span>
      </Button>
    </div>
  );
};
