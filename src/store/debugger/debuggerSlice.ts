import { createListenerMiddleware, createSlice } from "@reduxjs/toolkit";
import { AvailablePvms, CurrentInstruction, ExpectedState, SpiProgram, Status } from "@/types/pvm.ts";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { RootState } from "@/store";
import { SelectedPvmWithPayload } from "@/components/PvmSelect";
import { PvmTypes } from "@/packages/web-worker/types.ts";
import { logger } from "@/utils/loggerService.tsx";

export type UiRefreshMode = "instructions" | "block";

export interface UiRefreshRate {
  mode: UiRefreshMode;
  instructionCount: number;
}

export interface DebuggerState {
  pvmOptions: {
    allAvailablePvms: SelectedPvmWithPayload[];
    selectedPvm: string[];
  };
  isProgramInvalid: boolean;
  breakpointAddresses: number[];
  clickedInstruction: CurrentInstruction | null;
  hasHostCallOpen: boolean;
  pendingHostCallIndex: number | null;
  initialState: ExpectedState;
  instructionMode: InstructionMode;
  isDebugFinished: boolean;
  isProgramEditMode: boolean;
  isRunMode: boolean;
  isStepMode: boolean;
  exampleName: string | null;
  programName: string;
  program: number[];
  programPreviewResult: CurrentInstruction[];
  pvmInitialized: boolean;
  pvmLoaded: boolean;
  stepsToPerform: number;
  useBlockStepping: boolean;
  uiRefreshRate: UiRefreshRate;
  serviceId: number | null;
  hostCallsTrace: null;
  spiProgram: SpiProgram | null;
  spiArgs: Uint8Array | null;
  activeMobileTab: "program" | "status" | "memory";
}

const initialState: DebuggerState = {
  pvmOptions: {
    allAvailablePvms: [
      {
        id: AvailablePvms.TYPEBERRY,
        type: PvmTypes.BUILT_IN,
        label: `@typeberry/pvm v${import.meta.env.TYPEBERRY_PVM_VERSION}`,
      },
      {
        id: AvailablePvms.POLKAVM,
        type: PvmTypes.WASM_URL,
        params: { metaUrl: "https://todr.me/polkavm/pvm-metadata.json" },
        label: "PolkaVM",
      },
      {
        id: AvailablePvms.ANANAS,
        type: PvmTypes.WASM_URL,
        params: {
          metaUrl: "https://todr.me/anan-as/pvm-metadata.json",
        },
        label: "Anan-AS",
      },
    ],
    selectedPvm: [AvailablePvms.TYPEBERRY],
  },
  // set only if an example is loaded
  exampleName: null,
  programName: "<empty>",
  program: [],
  spiProgram: null,
  spiArgs: null,
  initialState: {
    regs: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000n,
    status: Status.OK,
  },
  isProgramEditMode: false,
  isProgramInvalid: false,
  isRunMode: false,
  isStepMode: false,
  hasHostCallOpen: false,
  pendingHostCallIndex: null,
  programPreviewResult: [],
  breakpointAddresses: [],
  clickedInstruction: null,
  instructionMode: InstructionMode.ASM,
  isDebugFinished: false,
  pvmInitialized: false,
  pvmLoaded: false,
  stepsToPerform: 1,
  useBlockStepping: true,
  uiRefreshRate: {
    mode: "block" as UiRefreshMode,
    instructionCount: 1,
  },
  hostCallsTrace: null,
  serviceId: parseInt("0x30303030", 16),
  activeMobileTab: "program",
};

const debuggerSlice = createSlice({
  name: "debugger",
  initialState,
  reducers: {
    setProgram(
      state,
      action: {
        payload: {
          program: number[];
          programName: string;
          spiProgram: SpiProgram | null;
          exampleName?: string;
        };
      },
    ) {
      const { program, programName, exampleName, spiProgram } = action.payload;
      state.program = program;
      state.programName = programName;
      state.spiProgram = spiProgram;
      state.exampleName = exampleName ?? null;
    },
    setInitialState(state, action) {
      state.initialState = action.payload;
    },
    setIsProgramEditMode(state, action) {
      state.isProgramEditMode = action.payload;
    },
    setIsProgramInvalid(state, action) {
      state.isProgramInvalid = action.payload;
    },
    setIsRunMode(state, action) {
      state.isRunMode = action.payload;
    },
    setIsStepMode(state, action) {
      state.isStepMode = action.payload;
    },
    setProgramPreviewResult(state, action) {
      state.programPreviewResult = action.payload;
    },
    setBreakpointAddresses(state, action) {
      state.breakpointAddresses = action.payload;
    },
    setClickedInstruction(state, action) {
      state.clickedInstruction = action.payload;
    },
    setInstructionMode(state, action) {
      state.instructionMode = action.payload;
    },
    setIsDebugFinished(state, action) {
      state.isDebugFinished = action.payload;
    },
    setPvmInitialized(state, action) {
      state.pvmInitialized = action.payload;
    },
    setPvmLoaded(state, action) {
      state.pvmLoaded = action.payload;
    },
    setStepsToPerform(state, action) {
      state.stepsToPerform = action.payload;
    },
    setUseBlockStepping(state, action) {
      state.useBlockStepping = action.payload;
    },
    setUiRefreshRate(state, action) {
      state.uiRefreshRate = action.payload;
      state.stepsToPerform = action.payload.instructionCount;
      state.useBlockStepping = action.payload.mode === "block";
    },
    setHasHostCallOpen(state, action) {
      state.hasHostCallOpen = action.payload;
    },
    setPendingHostCallIndex(state, action: { payload: number | null }) {
      state.pendingHostCallIndex = action.payload;
    },
    setServiceId(state, action) {
      state.serviceId = action.payload;
    },
    setSpiProgram(state, action: { payload: SpiProgram }) {
      state.spiProgram = action.payload;
    },
    setSpiArgs(state, action) {
      state.spiArgs = action.payload;
    },
    setPvmOptions(state, action) {
      state.pvmOptions.allAvailablePvms = action.payload;
    },
    setSelectedPvms(state, action) {
      state.pvmOptions.selectedPvm = action.payload;
    },
    setActiveMobileTab(state, action) {
      state.activeMobileTab = action.payload;
    },
  },
});

export const {
  setIsProgramInvalid,
  setBreakpointAddresses,
  setClickedInstruction,
  setHasHostCallOpen,
  setPendingHostCallIndex,
  setInitialState,
  setInstructionMode,
  setIsDebugFinished,
  setIsProgramEditMode,
  setIsRunMode,
  setIsStepMode,
  setProgram,
  setProgramPreviewResult,
  setPvmInitialized,
  setPvmLoaded,
  setStepsToPerform,
  setUseBlockStepping,
  setUiRefreshRate,
  setServiceId,
  setSpiArgs,
  setPvmOptions,
  setSelectedPvms,
  setActiveMobileTab,
} = debuggerSlice.actions;

export const debuggerSliceListenerMiddleware = createListenerMiddleware();
debuggerSliceListenerMiddleware.startListening({
  actionCreator: setProgram,
  effect: async (action) => {
    const { program, exampleName } = action.payload;

    // Update the URL with the new program converted to a hex string
    const hexProgram = program.map((x: number) => x.toString(16).padStart(2, "0")).join("");

    // MAX_URL_LENGTH is an arbitrary limit so there may be a better value for this purpose
    const MAX_URL_LENGTH = 2 ** 13;

    const params = new URLSearchParams(window.location.search);
    // If the program is less than MAX_URL_LENGTH, update the URL, otherwise do nothing as it will probably crash the browser or make it very slow
    if (hexProgram?.length < MAX_URL_LENGTH) {
      params.set("program", `0x${hexProgram}`);
    } else {
      params.delete("program");
      logger.warn("Program is too large to be stored in the URL");
    }
    if (exampleName) {
      params.set("example", exampleName);
    } else {
      params.delete("example");
    }

    window.history.pushState({}, "", `?${params.toString()}`);
  },
});

export const selectProgram = (state: RootState) => state.debugger.program;
export const selectInitialState = (state: RootState) => state.debugger.initialState;
export const selectIsProgramEditMode = (state: RootState) => state.debugger.isProgramEditMode;
export const selectIsProgramInvalid = (state: RootState) => state.debugger.isProgramInvalid;
export const selectIsRunMode = (state: RootState) => state.debugger.isRunMode;
export const selectProgramPreviewResult = (state: RootState) => state.debugger.programPreviewResult;
export const selectBreakpointAddresses = (state: RootState) => state.debugger.breakpointAddresses;
export const selectClickedInstruction = (state: RootState) => state.debugger.clickedInstruction;
export const selectInstructionMode = (state: RootState) => state.debugger.instructionMode;
export const selectIsDebugFinished = (state: RootState) => state.debugger.isDebugFinished;
export const selectPvmInitialized = (state: RootState) => state.debugger.pvmInitialized;
export const selectAllAvailablePvms = (state: RootState) => state.debugger.pvmOptions.allAvailablePvms;
export const selectSelectedPvms = (state: RootState) => state.debugger.pvmOptions.selectedPvm;

export default debuggerSlice.reducer;
