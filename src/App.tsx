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

import { Commands, PvmTypes } from "./packages/web-worker/worker";
import { InitialLoadProgramCTA } from "@/components/InitialLoadProgramCTA";
import { MobileRegisters } from "./components/MobileRegisters";
import { MobileKnowledgeBase } from "./components/KnowledgeBase/Mobile";
import { virtualTrapInstruction } from "./utils/virtualTrapInstruction";
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
  const [previousState, setPreviousState] = useState<ExpectedState>(initialState as ExpectedState);
  const [breakpointAddresses, setBreakpointAddresses] = useState<(number | undefined)[]>([]);

  const [isDebugFinished, setIsDebugFinished] = useState(false);
  const [pvmInitialized, setPvmInitialized] = useState(false);

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

  console.log("pvmInitialized", pvmInitialized);

  useEffect(() => {
    if (!worker.lastEvent) {
      return;
    }

    if (worker.lastEvent.command === Commands.STEP) {
      const { state, isFinished, isRunMode } = worker.lastEvent.payload;
      setCurrentState((prevState) => {
        setPreviousState(prevState);
        return state;
      });
      setCurrentInstruction(worker.lastEvent.payload.result);

      if (isRunMode && !isFinished && !breakpointAddresses.includes(state.pc)) {
        worker.worker.postMessage({ command: "step", payload: { program } });
      }

      if (isRunMode && breakpointAddresses.includes(state.pc)) {
        worker.worker.postMessage({ command: "stop", payload: { program } });
      }

      if (isFinished) {
        setIsDebugFinished(true);
      }

      // Refresh page on each step
      if (memory.page.state.pageNumber !== undefined) {
        memoryActions.changePage(memory.page.state.pageNumber);
      }
    }
    if (worker.lastEvent.command === Commands.LOAD) {
      restartProgram(initialState);
    }
    if (worker.lastEvent.command === Commands.INIT) {
      memoryActions.initSetPageSize();
    }

    if (worker.lastEvent.command === Commands.MEMORY_SIZE) {
      memoryActions.setPageSize(worker.lastEvent.payload.memorySize);
    }
    if (worker.lastEvent.command === Commands.MEMORY_PAGE) {
      if (memory.page.state.isLoading) {
        memory.page.setState({
          ...memory.page.state,
          data: worker.lastEvent.payload.memoryPage,
          pageNumber: worker.lastEvent.payload.pageNumber,
          isLoading: false,
        });
      }
    } else if (worker.lastEvent.command === Commands.MEMORY_RANGE) {
      const { start, end, memoryRange } = worker.lastEvent.payload;
      memory.range.setState({
        ...memory.range.state,
        data: [
          ...memory.range.state.data.map((el) =>
            el.start === start && el.end === end ? { start, end, data: memoryRange } : el,
          ),
        ],
        isLoading: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker.lastEvent]);

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

      worker.worker.postMessage({ command: "init", payload: { program: newProgram, initialState } });

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
      worker.worker.postMessage({ command: "step", payload: { program } });
    }

    setIsProgramEditMode(false);
  };

  const handleRunProgram = () => {
    if (!pvmInitialized) {
      startProgram(initialState, program);
    }

    worker.worker.postMessage({ command: "run", payload: { program } });
    worker.worker.postMessage({ command: "step", payload: { program } });
  };

  const restartProgram = useCallback(
    (state: InitialState) => {
      setIsDebugFinished(false);
      setCurrentState(state);
      setPreviousState(state);
      setCurrentInstruction(programPreviewResult?.[0]);
      worker.worker.postMessage({ command: "init", payload: { program, initialState: state } });
    },
    [worker, setCurrentInstruction, program, programPreviewResult],
  );

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

  const handlePvmTypeChange = ({ type, param }: { type: string; param: string | Blob }) => {
    console.log("Selected PVM type", type, param);

    if (type === PvmTypes.WASM_FILE) {
      worker.worker.postMessage({ command: "load", payload: { type, params: { file: param } } });
    } else if (type === PvmTypes.WASM_URL) {
      worker.worker.postMessage({ command: "load", payload: { type, params: { url: param } } });
    } else {
      worker.worker.postMessage({ command: "load", payload: { type } });
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
                <PvmSelect onValueChange={handlePvmTypeChange} />
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
                previousState={isProgramEditMode ? initialState : previousState}
                onCurrentStateChange={(state) => {
                  setInitialState(state);
                  restartProgram(state);
                }}
                allowEditing={true}
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
