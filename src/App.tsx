import "./App.css";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef } from "react";
import { Instructions } from "./components/Instructions";
import { Registers } from "./components/Registers";
import { AvailablePvms, CurrentInstruction, ExpectedState, InitialState, Status } from "./types/pvm";

import { disassemblify } from "./packages/pvm/pvm/disassemblify";
import { Pencil, PencilOff, Play, RefreshCcw, StepForward } from "lucide-react";
import { Header } from "@/components/Header";
import { KnowledgeBase } from "@/components/KnowledgeBase";
import { ProgramUpload } from "@/components/ProgramUpload";
import { ProgramUploadFileOutput } from "@/components/ProgramUpload/types.ts";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { PvmSelect, SelectedPvmWithPayload } from "@/components/PvmSelect";
import { NumeralSystemSwitch } from "@/components/NumeralSystemSwitch";

import { PvmTypes } from "./packages/web-worker/worker";
import { InitialLoadProgramCTA } from "@/components/InitialLoadProgramCTA";
import { MobileRegisters } from "./components/MobileRegisters";
import { MobileKnowledgeBase } from "./components/KnowledgeBase/Mobile";
import { virtualTrapInstruction } from "./utils/virtualTrapInstruction";
import { Assembly } from "./components/ProgramUpload/Assembly";
import {
  continueAllWorkers,
  createWorker,
  destroyWorker,
  initAllWorkers,
  loadWorker,
  runAllWorkers,
  setAllWorkersCurrentInstruction,
  setAllWorkersCurrentState,
  setAllWorkersPreviousState,
  stepAllWorkers,
  WorkerState,
} from "@/store/workers/workersSlice.ts";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import {
  setBreakpointAddresses,
  setClickedInstruction,
  setInitialState,
  setInstructionMode,
  setIsAsmError,
  setIsDebugFinished,
  setIsProgramEditMode,
  setIsRunMode,
  setProgram,
  setProgramPreviewResult,
  setPvmInitialized,
} from "@/store/debugger/debuggerSlice.ts";
import { MemoryPreview } from "@/components/MemoryPreview";

function App() {
  const {
    program,
    initialState,
    isProgramEditMode,
    isAsmError,
    programPreviewResult,
    clickedInstruction,
    instructionMode,
    breakpointAddresses,
    isDebugFinished,
    pvmInitialized,
    isRunMode,
  } = useAppSelector((state) => state.debugger);

  const workers = useAppSelector((state) => state.workers);
  const dispatch = useAppDispatch();
  const { currentInstruction, currentState, previousState } = workers[0] || {
    currentInstruction: null,
    currentState: initialState,
    previousState: initialState,
  };

  const mobileView = useRef<HTMLDivElement | null>(null);

  const setCurrentInstruction = useCallback(
    (ins: CurrentInstruction | null) => {
      if (ins === null) {
        dispatch(setAllWorkersCurrentInstruction(virtualTrapInstruction));
      } else {
        dispatch(setAllWorkersCurrentInstruction(ins));
      }
      dispatch(setClickedInstruction(null));
    },
    [dispatch],
  );

  const restartProgram = useCallback(
    (state: InitialState) => {
      dispatch(setIsDebugFinished(false));
      dispatch(setIsRunMode(false));
      dispatch(setAllWorkersCurrentState(state));
      dispatch(setAllWorkersPreviousState(state));
      dispatch(initAllWorkers());
      setCurrentInstruction(programPreviewResult?.[0]);
    },
    [setCurrentInstruction, programPreviewResult, dispatch],
  );

  useEffect(() => {
    const initializeDefaultWorker = async () => {
      await dispatch(createWorker(AvailablePvms.TYPEBERRY)).unwrap();
      await dispatch(
        loadWorker({
          id: AvailablePvms.TYPEBERRY,
          payload: {
            type: PvmTypes.BUILT_IN,
          },
        }),
      ).unwrap();
    };

    initializeDefaultWorker();

    return () => {
      // if (currentWorkers) {
      //   currentWorkers.forEach((currentWorker) => {
      //     currentWorker.terminate();
      //   });
      // }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startProgram = useCallback(
    (initialState: ExpectedState, newProgram: number[]) => {
      dispatch(setInitialState(initialState));
      dispatch(setProgram(newProgram));
      const currentState = {
        pc: 0,
        regs: initialState.regs,
        gas: initialState.gas,
        pageMap: initialState.pageMap,
        status: Status.OK,
      };
      dispatch(setAllWorkersCurrentState(currentState));
      dispatch(setAllWorkersPreviousState(currentState));

      setIsDebugFinished(false);

      dispatch(initAllWorkers());

      try {
        const result = disassemblify(new Uint8Array(newProgram));
        console.info("Disassembly result:", result);
        dispatch(setProgramPreviewResult(result));
        dispatch(setAllWorkersCurrentInstruction(result?.[0]));
        dispatch(setPvmInitialized(true));
      } catch (e) {
        console.log("Error disassembling program", e);
      }
    },
    [dispatch],
  );

  const handleFileUpload = useCallback(
    (data?: ProgramUploadFileOutput) => {
      if (data) {
        startProgram(data.initial, data.program);
        dispatch(setIsAsmError(false));
      } else {
        dispatch(setIsAsmError(true));
      }
    },
    [startProgram, dispatch],
  );

  const onNext = () => {
    if (!workers.length) {
      console.warn("No workers initialized"); // TODO: show error message
      return;
    }

    // if (!pvmInitialized) {
    //   startProgram(initialState, program);
    // }

    if (!currentInstruction) {
      dispatch(setAllWorkersCurrentState(initialState));
    } else {
      dispatch(stepAllWorkers());
    }

    dispatch(setIsProgramEditMode(false));
  };

  const handleRunProgram = () => {
    if (!workers.length) {
      console.warn("No workers initialized"); // TODO: show error message
      return;
    }

    if (isRunMode) {
      dispatch(continueAllWorkers());
    } else {
      startProgram(initialState, program);
      dispatch(setIsRunMode(true));
      dispatch(runAllWorkers());
    }
    // dispatch(stepAllWorkers());
  };

  const handleBreakpointClick = (address: number) => {
    if (breakpointAddresses.includes(address)) {
      dispatch(setBreakpointAddresses(breakpointAddresses.filter((x) => x !== address)));
    } else {
      dispatch(setBreakpointAddresses([...breakpointAddresses, address]));
    }
  };
  const onInstructionClick = useCallback(
    (row: CurrentInstruction) => {
      dispatch(setClickedInstruction(row));
    },
    [dispatch],
  );

  const isMobileViewActive = () => {
    return mobileView?.current?.offsetParent !== null;
  };

  const handlePvmTypeChange = async (selectedPvms: SelectedPvmWithPayload[]) => {
    console.log("selectedPvms vs workers ", selectedPvms, workers);

    await Promise.all(
      workers.map((worker: WorkerState) => {
        dispatch(destroyWorker(worker.id)).unwrap();
      }),
    );

    await Promise.all(
      selectedPvms.map(async ({ value, type, param }) => {
        console.log("Selected PVM type", type, param);

        if (workers.find((worker: WorkerState) => worker.id === type)) {
          console.log("Worker already initialized");
          // TODO: for now just initialize the worker one more time
        }
        console.log("Worker not initialized");

        if (value === AvailablePvms.WASM_FILE) {
          await dispatch(createWorker(AvailablePvms.WASM_FILE)).unwrap();
          await dispatch(
            loadWorker({
              id: AvailablePvms.WASM_FILE,
              payload: {
                type: PvmTypes.WASM_FILE,
                params: { file: param as Blob },
              },
            }),
          ).unwrap();
        } else if (value === AvailablePvms.WASM_URL) {
          await dispatch(createWorker(AvailablePvms.WASM_URL)).unwrap();
          await dispatch(
            loadWorker({
              id: AvailablePvms.WASM_URL,
              payload: {
                type: PvmTypes.WASM_URL,
                params: { url: param as string },
              },
            }),
          ).unwrap();
        } else if (value === AvailablePvms.POLKAVM) {
          await dispatch(createWorker(AvailablePvms.POLKAVM)).unwrap();
          await dispatch(
            loadWorker({
              id: AvailablePvms.POLKAVM,
              payload: {
                type: PvmTypes.WASM_URL as PvmTypes,
                params: { url: param as string },
              },
            }),
          ).unwrap();
        } else if (value === AvailablePvms.TYPEBERRY) {
          await dispatch(createWorker(AvailablePvms.TYPEBERRY)).unwrap();
          await dispatch(
            loadWorker({
              id: AvailablePvms.TYPEBERRY,
              payload: {
                type: type as PvmTypes,
              },
            }),
          ).unwrap();
        }
      }),
    );

    restartProgram(initialState);
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
              <div className="w-full md:w-[350px]">
                <PvmSelect onValueChange={(selectedPvms) => handlePvmTypeChange(selectedPvms)} />
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

            <div className="max-sm:hidden col-span-12 md:col-span-3">{<MemoryPreview />}</div>

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
                    dispatch(setInstructionMode(checked ? InstructionMode.BYTECODE : InstructionMode.ASM))
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
                      dispatch(setIsProgramEditMode(false));
                    } else {
                      restartProgram(initialState);
                      dispatch(setIsProgramEditMode(true));
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

export default App;
