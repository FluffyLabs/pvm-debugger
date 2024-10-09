import "./App.css";
import { Button } from "@/components/ui/button";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Instructions } from "./components/Instructions";
import { Registers } from "./components/Registers";
import { CurrentInstruction, ExpectedState, InitialState, Status } from "./types/pvm";

import { disassemblify } from "./packages/pvm/pvm/disassemblify";
import { Play, RefreshCcw, StepForward, Pencil, PencilOff } from "lucide-react";
import { Header } from "@/components/Header";
import { MemoryPreview } from "@/components/MemoryPreview";
import { KnowledgeBase } from "@/components/KnowledgeBase";
import { ProgramUpload } from "@/components/ProgramUpload";
import { ProgramUploadFileOutput } from "@/components/ProgramUpload/types.ts";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { PvmSelect } from "@/components/PvmSelect";
import { NumeralSystemSwitch } from "@/components/NumeralSystemSwitch";

import { PvmTypes } from "./packages/web-worker/worker";
import { InitialLoadProgramCTA } from "@/components/InitialLoadProgramCTA";
import { MobileRegisters } from "./components/MobileRegisters";
import { MobileKnowledgeBase } from "./components/KnowledgeBase/Mobile";
import { virtualTrapInstruction } from "./utils/virtualTrapInstruction";
import { spawnWorker } from "@/packages/web-worker/spawnWorker.ts";
import { Store, StoreProvider } from "./AppProviders";
import { useMemoryFeature } from "./components/MemoryPreview/hooks/memoryFeature";
import { Assembly } from "./components/ProgramUpload/Assembly";

function App() {
  const [program, setProgram] = useState<number[]>([]);
  const [isAsmError, setAsmError] = useState(false);
  const [isProgramEditMode, setIsProgramEditMode] = useState(false);
  const [initialState, setInitialState] = useState<InitialState>({
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000,
  });
  const [programPreviewResult, setProgramPreviewResult] = useState<CurrentInstruction[]>([]);
  const [currentInstruction, setCurrentInstructionState] = useState<CurrentInstruction>();
  const [clickedInstruction, setClickedInstruction] = useState<CurrentInstruction | null>(null);
  const [instructionMode, setInstructionMode] = useState<InstructionMode>(InstructionMode.ASM);
  const [currentState, setCurrentState] = useState<ExpectedState>(initialState as ExpectedState);
  const [currentAlternativeState, setCurrentAlternativeState] = useState<ExpectedState>(initialState as ExpectedState);
  const [previousState, setPreviousState] = useState<ExpectedState>(initialState as ExpectedState);
  const [breakpointAddresses, setBreakpointAddresses] = useState<(number | undefined)[]>([]);
  const [, setIsRunMode] = useState(false);

  const [isDebugFinished, setIsDebugFinished] = useState(false);
  const [pvmInitialized, setPvmInitialized] = useState(false);
  const [currentWorkers, setCurrentWorkers] = useState<Worker[] | null>(null);

  const mobileView = useRef<HTMLDivElement | null>(null);
  const { worker, memory } = useContext(Store);
  const { actions: memoryActions } = useMemoryFeature();

  const setCurrentInstruction = useCallback((ins: CurrentInstruction | null) => {
    if (ins === null) {
      setCurrentInstruction(virtualTrapInstruction);
    } else {
      setCurrentInstructionState(ins);
    }
    setClickedInstruction(null);
  }, []);

  const restartProgram = useCallback(
    (state: InitialState) => {
      setIsDebugFinished(false);
      setCurrentState(state);
      setPreviousState(state);
      setCurrentInstruction(programPreviewResult?.[0]);

      if (currentWorkers) {
        currentWorkers.forEach((currentWorker) => {
          currentWorker.postMessage({ command: "init", payload: { program, initialState: state } });
        });
      } else {
        console.error("Worker is not initialized");
      }
    },
    [setCurrentInstruction, program, programPreviewResult, currentWorkers],
  );

  useEffect(() => {
    const initializeDefaultWorker = async () => {
      const worker = await spawnWorker({
        setCurrentState,
        setPreviousState,
        setCurrentInstruction,
        breakpointAddresses,
        initialState,
        program,
        setIsRunMode,
        setIsDebugFinished,
        restartProgram,
      });
      worker?.postMessage({ command: "load", payload: { type: "built-in" } });
      setCurrentWorkers([worker]);
    };

    initializeDefaultWorker();

    return () => {
      if (currentWorkers) {
        currentWorkers.forEach((currentWorker) => {
          currentWorker.terminate();
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startProgram = useCallback(
    (initialState: ExpectedState, newProgram: number[]) => {
      setInitialState(initialState);
      setProgram(newProgram);
      const currentState = {
        pc: 0,
        regs: initialState.regs,
        gas: initialState.gas,
        pageMap: initialState.pageMap,
        status: Status.OK,
      };
      setCurrentState(currentState);
      setPreviousState(currentState);

      setIsDebugFinished(false);

    currentWorkers?.forEach((currentWorker) => {
      currentWorker?.postMessage({ command: "init", payload: { program: newProgram, initialState } });
    });

      try {
        const result = disassemblify(new Uint8Array(newProgram));
        console.info("Disassembly result:", result);
        setProgramPreviewResult(result);
        setCurrentInstruction(result?.[0]);
        setPvmInitialized(true);
      } catch (e) {
        console.log("Error disassembling program", e);
      }
    },
    [setCurrentInstruction, worker.worker],
  );

  const handleFileUpload = useCallback(
    (data?: ProgramUploadFileOutput) => {
      if (data) {
        startProgram(data.initial, data.program);
        setAsmError(false);
      } else {
        setAsmError(true);
      }
    },
    [startProgram],
  );

  const onNext = () => {
    if (!pvmInitialized) {
      startProgram(initialState, program);
    }

    if (!currentInstruction) {
      setCurrentState(initialState);
    } else {
      currentWorkers?.forEach((currentWorker) => {
        currentWorker?.postMessage({ command: "step", payload: { program } });
      });
    }

    setIsProgramEditMode(false);
  };

  const handleRunProgram = () => {
    if (!pvmInitialized) {
      startProgram(initialState, program);
    }
    setIsRunMode(true);

    currentWorkers?.forEach((currentWorker) => {
      currentWorker?.postMessage({ command: "run", payload: { program } });
      currentWorker?.postMessage({ command: "step", payload: { program } });
    });
  };

  const handleBreakpointClick = (address: number) => {
    if (breakpointAddresses.includes(address)) {
      setBreakpointAddresses(breakpointAddresses.filter((x) => x !== address));
    } else {
      setBreakpointAddresses([...breakpointAddresses, address]);
    }
  };
  const onInstructionClick = useCallback((row: CurrentInstruction) => {
    setClickedInstruction(row);
  }, []);

  const isMobileViewActive = () => {
    return mobileView?.current?.offsetParent !== null;
  };

  const handlePvmTypeChange = async ({
    pvmSlot,
    type,
    param,
  }: {
    pvmSlot: number;
    type: string;
    param: string | Blob;
  }) => {
    console.log("Selected PVM type", type, param);

    if (!currentWorkers) {
      console.error("No worker is initialized");
      return;
    }

    const currentWorker = currentWorkers?.[pvmSlot];

    if (currentWorker) {
      currentWorker.terminate();
    }

    // TODO: move to some function
    const worker = await spawnWorker({
      setCurrentState: pvmSlot === 0 ? setCurrentState : setCurrentAlternativeState,
      setPreviousState,
      setCurrentInstruction,
      breakpointAddresses,
      initialState,
      program,
      setIsRunMode,
      setIsDebugFinished,
      restartProgram,
    });

    console.log({
      worker,
    });
    // currentWorker?.postMessage({ command: "load", payload: { type: "built-in" } });
    setCurrentWorkers([...currentWorkers.slice(0, pvmSlot), worker, ...currentWorkers.slice(pvmSlot + 1)]);

    if (type === PvmTypes.WASM_FILE) {
      worker?.postMessage({ command: "load", payload: { type, params: { file: param } } });
    } else if (type === PvmTypes.WASM_URL) {
      worker?.postMessage({ command: "load", payload: { type, params: { url: param } } });
    } else {
      worker?.postMessage({ command: "load", payload: { type } });
    }
  };

  return (
    <>
      <Header />
      <div className="p-3 text-left w-screen">
        <div className="flex flex-col gap-5">
          <div className="grid grid-rows md:grid-cols-12 gap-1.5 pt-2">
            <div className="col-span-12 md:col-span-6 max-sm:order-2 flex align-middle max-sm:justify-between mb-3">
              <div className="md:mr-3">
                <ProgramUpload initialState={initialState} onFileUpload={handleFileUpload} program={program} />
              </div>
              <Button
                className="md:mr-3"
                onClick={() => {
                  restartProgram(initialState);
                  setCurrentInstruction(programPreviewResult?.[0]);
                }}
                disabled={!pvmInitialized || isProgramEditMode}
              >
                <RefreshCcw className="w-3.5 md:mr-1.5" />
                <span className="hidden md:block">Reset</span>
              </Button>
              <Button
                className="md:mr-3"
                onClick={handleRunProgram}
                disabled={isDebugFinished || !pvmInitialized || isProgramEditMode}
              >
                <Play className="w-3.5 md:mr-1.5" />
                <span className="hidden md:block">Run</span>
              </Button>
              <Button
                className="md:mr-3"
                onClick={onNext}
                disabled={isDebugFinished || !pvmInitialized || isProgramEditMode}
              >
                <StepForward className="w-3.5 md:mr-1.5" />
                <span className="hidden md:block">Step</span>
              </Button>
            </div>

            <div className="col-span-12 md:col-span-6 max-sm:order-first flex align-middle items-center justify-end">
              <div className="w-full md:w-[300px]">
                <PvmSelect
                  onValueChange={({ type, param }) =>
                    handlePvmTypeChange({
                      pvmSlot: 0,
                      type,
                      param,
                    })
                  }
                />
              </div>
              <div className="w-full md:w-[300px]">
                <PvmSelect
                  onValueChange={({ type, param }) =>
                    handlePvmTypeChange({
                      pvmSlot: 1,
                      type,
                      param,
                    })
                  }
                />
              </div>
              <NumeralSystemSwitch className="hidden md:flex ml-3" />
            </div>

            <div className="col-span-12 md:col-span-4 max-sm:max-h-[70vh] max-sm:min-h-[330px]">
              {!program.length && <InitialLoadProgramCTA />}
              {!!program.length && (
                <>
                  {isProgramEditMode && (
                    <div className="border-2 rounded-md h-full p-2 pt-8">
                      <Assembly program={program} onFileUpload={handleFileUpload} initialState={initialState} />
                    </div>
                  )}

                  {!isProgramEditMode && (
                    <>
                      <Instructions
                        status={currentState.status}
                        currentState={currentState}
                        programPreviewResult={programPreviewResult}
                        instructionMode={instructionMode}
                        onAddressClick={handleBreakpointClick}
                        breakpointAddresses={breakpointAddresses}
                        onInstructionClick={onInstructionClick}
                      />
                    </>
                  )}
                </>
              )}
            </div>

            <div className="max-sm:hidden md:col-span-2">
              <Registers
                currentState={isProgramEditMode ? initialState : currentState}
                currentAlternativeState={isProgramEditMode ? initialState : currentAlternativeState}
                previousState={isProgramEditMode ? initialState : previousState}
                onCurrentStateChange={(state) => {
                  setInitialState(state);
                  restartProgram(state);
                }}
                allowEditing={false}
              />
            </div>

            <div className="col-span-12 md:hidden">
              <MobileRegisters
                isEnabled={pvmInitialized}
                currentState={isProgramEditMode ? initialState : currentState}
                previousState={isProgramEditMode ? initialState : previousState}
              />
            </div>

            <div className="max-sm:hidden col-span-12 md:col-span-3">
              <MemoryPreview />
            </div>

            <div className="max-sm:hidden md:col-span-3 overflow-hidden">
              <KnowledgeBase currentInstruction={clickedInstruction ?? currentInstruction} />
            </div>

            <div className="md:hidden col-span-12 order-last" ref={mobileView}>
              <MobileKnowledgeBase
                currentInstruction={clickedInstruction ?? currentInstruction}
                open={clickedInstruction !== null && isMobileViewActive()}
                onClose={() => setClickedInstruction(null)}
              />
            </div>

            <div className="col-span-12 md:col-span-4 max-sm:order-first flex items-center justify-between my-3">
              <div className={`flex items-center space-x-2 ${!program.length ? "invisible" : "visible"}`}>
                <Label htmlFor="instruction-mode">ASM</Label>
                <Switch
                  disabled={isProgramEditMode}
                  id="instruction-mode"
                  checked={instructionMode === InstructionMode.BYTECODE}
                  onCheckedChange={(checked) =>
                    setInstructionMode(checked ? InstructionMode.BYTECODE : InstructionMode.ASM)
                  }
                />
                <Label htmlFor="instruction-mode">RAW</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="link"
                  size="icon"
                  className={!program.length ? "invisible" : "visible"}
                  disabled={!program.length || isAsmError}
                  title="Edit the code"
                  onClick={() => {
                    if (isProgramEditMode) {
                      startProgram(initialState, program);
                      setIsProgramEditMode(false);
                    } else {
                      restartProgram(initialState);
                      setIsProgramEditMode(true);
                    }
                  }}
                >
                  {isProgramEditMode ? <PencilOff /> : <Pencil />}
                </Button>
              </div>
              <NumeralSystemSwitch className="ml-3 md:hidden" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
const WrappedApp = () => (
  <StoreProvider>
    <App />
  </StoreProvider>
);

export default WrappedApp;
