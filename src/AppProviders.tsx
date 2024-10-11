import React, { createContext, useCallback, useMemo, useState } from "react";
import { useMemoryFeature } from "./components/MemoryPreview/hooks/memoryFeature";
import { spawnWorker } from "@/packages/web-worker/spawnWorker"; // Import the spawnWorker function
import { InitialState, ExpectedState, CurrentInstruction } from "@/types/pvm.ts";

// Custom hook for managing a single worker
const useWorkerState = (id: string) => {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [isRunMode, setIsRunMode] = useState(false);
  const [isDebugFinished, setIsDebugFinished] = useState(false);
  const [initialState, setInitialState] = useState<InitialState>({} as InitialState);
  const [program, setProgram] = useState<number[]>([]);
  const [breakpointAddresses, setBreakpointAddresses] = useState<(number | undefined)[]>([]);
  const [currentState, setCurrentState] = useState<ExpectedState>({} as ExpectedState);
  const [previousState, setPreviousState] = useState<ExpectedState>({} as ExpectedState);
  const [currentInstruction, setCurrentInstruction] = useState<CurrentInstruction | null>(null);
  const { state: memory, actions: memoryActions } = useMemoryFeature();

  const restartProgram = useCallback((initialState: InitialState) => {
    // Implement this function
  }, []);

  // Initialize worker and handle messages
  React.useEffect(() => {
    const createWorker = async () => {
      if (!initialState || !program) {
        return;
      }

      console.log('creating worker with id', id);

      const worker = await spawnWorker({
        setCurrentState: setCurrentState,
        setPreviousState: (prevState) => setPreviousState(prevState),
        setCurrentInstruction: (instruction) => setCurrentInstruction(instruction),
        breakpointAddresses,
        initialState,
        program,
        setIsRunMode,
        setIsDebugFinished,
        restartProgram,
        memoryActions,
        memory,
      });

      setWorker(worker);
    }

    createWorker();

    return () => {
      worker?.terminate(); // Ensure the worker is terminated on cleanup
    };
  }, [id, initialState, program, breakpointAddresses, memoryActions, memory]);

  return {
    worker,
    isRunMode,
    isDebugFinished,
    initialState,
    program,
    breakpointAddresses,
    currentState,
    previousState,
    currentInstruction,
    memory,
    memoryActions,
    restartProgram,
    setIsRunMode,
    setIsDebugFinished,
    setInitialState,
    setProgram,
    setBreakpointAddresses,
    setCurrentState,
    setPreviousState,
    setCurrentInstruction,
  };
};

const useWorkersState = () => {
  const [workerIds, setWorkerIds] = useState<string[]>([]);

  const createWorker = useCallback((id: string) => {
    setWorkerIds(prev => [...prev, id]);
  }, []);

  const destroyWorker = useCallback((id: string) => {
    setWorkerIds(prev => prev.filter(workerId => workerId !== id));
  }, []);

  const workerStates = workerIds.map(workerId => useWorkerState(workerId));

  const getWorkerStateById = <K extends keyof ReturnType<typeof useWorkerState>>(id: string, key: K) => {
    const workerState = workerStates.find((worker, index) => workerIds[index] === id);
    return workerState ? workerState[key] : null; // Return the specified state or null if not found
  };

  const workers = workerStates.map(workerState => workerState.worker);

  return { workerIds, createWorker, destroyWorker, getWorkerStateById, workers };
};

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const { workerIds, createWorker, destroyWorker, getWorkerStateById } = useWorkersState();

  const contextValue = useMemo(
    () => ({ workerIds, createWorker, destroyWorker, getWorkerStateById }),
    [workerIds, createWorker, destroyWorker, getWorkerStateById],
  );

  return (
    <Store.Provider value={contextValue}>
      {workerIds.map((id) => {
        useWorkerState(id);
        return null; // No rendering needed
      })}
      {children}
    </Store.Provider>
  );
};

// Define WorkerState as a type
type WorkerState = ReturnType<typeof useWorkerState>;

export const Store = createContext<{
  workerIds: string[];
  workers: Worker[];
  createWorker: (id: string) => void;
  destroyWorker: (id: string) => void;
  getWorkerStateById: <K extends keyof ReturnType<typeof useWorkerState>>(
    id: string,
    key: K,
  ) => ReturnType<typeof useWorkerState>[K] | null;
}>({
  workerIds: [],
  workers: [],
  createWorker: () => {},
  destroyWorker: () => {},
  getWorkerStateById: () => null,
});
