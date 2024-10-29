import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { Button } from "@/components/ui/button";
import { useCallback, useRef } from "react";
import { Instructions } from "./components/Instructions";
import { Registers } from "./components/Registers";
import { AvailablePvms, CurrentInstruction } from "./types/pvm";
import { Pencil, PencilOff } from "lucide-react";
import { Header } from "@/components/Header";
import { KnowledgeBase } from "@/components/KnowledgeBase";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { PvmSelect, SelectedPvmWithPayload } from "@/components/PvmSelect";
import { NumeralSystemSwitch } from "@/components/NumeralSystemSwitch";

import { PvmTypes } from "./packages/web-worker/worker";
import { InitialLoadProgramCTA } from "@/components/InitialLoadProgramCTA";
import { MobileRegisters } from "./components/MobileRegisters";
import { MobileKnowledgeBase } from "./components/KnowledgeBase/Mobile";
import { Assembly } from "./components/ProgramLoader/Assembly";
import { createWorker, destroyWorker, loadWorker, WorkerState } from "@/store/workers/workersSlice.ts";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import {
  setClickedInstruction,
  setInitialState,
  setInstructionMode,
  setIsProgramEditMode,
} from "@/store/debugger/debuggerSlice.ts";
import { MemoryPreview } from "@/components/MemoryPreview";
import { logger } from "./utils/loggerService";
import { DebuggerControlls } from "./components/DebuggerControlls";
import { useDebuggerActions } from "./hooks/useDebuggerActions";

function App() {
  const debuggerActions = useDebuggerActions();

  const {
    program,
    initialState,
    isProgramEditMode,
    isAsmError,
    programPreviewResult,
    clickedInstruction,
    instructionMode,
    breakpointAddresses,
    pvmInitialized,
  } = useAppSelector((state) => state.debugger);

  const workers = useAppSelector((state) => state.workers);

  const dispatch = useAppDispatch();
  const { currentInstruction, currentState, previousState } = workers[0] || {
    currentInstruction: null,
    currentState: initialState,
    previousState: initialState,
  };

  const mobileView = useRef<HTMLDivElement | null>(null);

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
    logger.debug("selectedPvms vs workers ", selectedPvms, workers);

    await Promise.all(
      workers.map((worker: WorkerState) => {
        dispatch(destroyWorker(worker.id)).unwrap();
      }),
    );

    await Promise.all(
      selectedPvms.map(async ({ id, type, params }) => {
        logger.info("Selected PVM type", id, type, params);

        if (workers.find((worker: WorkerState) => worker.id === id)) {
          logger.info("Worker already initialized");
          // TODO: for now just initialize the worker one more time
        }
        logger.info("Worker not initialized");

        if (id === AvailablePvms.POLKAVM) {
          await dispatch(createWorker(AvailablePvms.POLKAVM)).unwrap();
          await dispatch(
            loadWorker({
              id,
              payload: {
                type: PvmTypes.WASM_URL as PvmTypes,
                params,
              },
            }),
          ).unwrap();
        } else if (id === AvailablePvms.TYPEBERRY) {
          await dispatch(createWorker(AvailablePvms.TYPEBERRY)).unwrap();
          await dispatch(
            loadWorker({
              id,
              payload: {
                type: PvmTypes.BUILT_IN,
              },
            }),
          ).unwrap();
        } else if (type === AvailablePvms.WASM_FILE) {
          await dispatch(createWorker(id)).unwrap();
          await dispatch(
            loadWorker({
              id,
              payload: {
                type: PvmTypes.WASM_FILE,
                params,
              },
            }),
          ).unwrap();
        } else if (type === AvailablePvms.WASM_URL) {
          await dispatch(createWorker(id)).unwrap();
          await dispatch(
            loadWorker({
              id,
              payload: {
                type: PvmTypes.WASM_URL,
                params,
              },
            }),
          ).unwrap();
        }
      }),
    );

    debuggerActions.restartProgram(initialState);
  };

  return (
    <>
      <Header />
      <div className="p-3 text-left w-screen">
        <div className="flex flex-col gap-5">
          <div className="grid grid-rows md:grid-cols-12 gap-1.5 pt-2">
            <DebuggerControlls />

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
                      <Assembly
                        program={program}
                        onProgramLoad={debuggerActions.handleProgramLoad}
                        initialState={initialState}
                      />
                    </div>
                  )}

                  {!isProgramEditMode && (
                    <>
                      <Instructions
                        status={currentState.status}
                        currentState={currentState}
                        programPreviewResult={programPreviewResult}
                        instructionMode={instructionMode}
                        onAddressClick={debuggerActions.handleBreakpointClick}
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
                  debuggerActions.restartProgram(state);
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
                      debuggerActions.startProgram(initialState, program);
                      dispatch(setIsProgramEditMode(false));
                    } else {
                      debuggerActions.restartProgram(initialState);
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
      <ToastContainer />
    </>
  );
}

export default App;
