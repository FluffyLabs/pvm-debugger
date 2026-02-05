import { createListenerMiddleware, createSlice } from "@reduxjs/toolkit";
import {
  AvailablePvms,
  CurrentInstruction,
  DEFAULT_GAS,
  DEFAULT_REGS,
  ExpectedState,
  SpiProgram,
  Status,
} from "@/types/pvm.ts";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { RootState } from "@/store";
import { SelectedPvmWithPayload } from "@/components/PvmSelect";
import { PvmTypes } from "@/packages/web-worker/types.ts";
import { logger } from "@/utils/loggerService.tsx";
import { HostCallEntry, ParsedTrace, parseTrace, StateMismatch } from "@/lib/hostCallTrace";

export type UiRefreshMode = "instructions" | "block";

export interface UiRefreshRate {
  mode: UiRefreshMode;
  instructionCount: number;
}

export interface HostCallTraceState {
  rawContent: string;
  parsed: ParsedTrace | null;
}

export interface HostCallPaused {
  hostCallId: number;
  entry: HostCallEntry | null;
  mismatches: StateMismatch[];
}

export interface DebuggerState {
  pvmOptions: {
    allAvailablePvms: SelectedPvmWithPayload[];
    selectedPvm: string[];
  };
  isProgramInvalid: boolean;
  breakpointAddresses: number[];
  clickedInstruction: CurrentInstruction | null;
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
  /** Loaded host call trace information. */
  hostCallsTrace: HostCallTraceState | null;
  /**
   * Index (count) of the next host call (NOT: id of the host call)
   * In case the trace is not loaded, this will simply count the host calls.
   */
  nextHostCallIndex: number;
  /** Currently pending host call. May include data from trace log. */
  pendingHostCall: HostCallPaused | null;
  autoContinueOnHostCalls: boolean;
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
  spiArgs: new Uint8Array([0x18, 0x00, 0x00]), // Default: 0x180000
  initialState: {
    regs: DEFAULT_REGS,
    pc: 0,
    pageMap: [],
    memory: [],
    gas: DEFAULT_GAS,
    status: Status.OK,
  },
  isProgramEditMode: false,
  isProgramInvalid: false,
  isRunMode: false,
  isStepMode: false,
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
    mode: "instructions" as UiRefreshMode,
    instructionCount: 10_000,
  },
  hostCallsTrace: null,
  pendingHostCall: null,
  nextHostCallIndex: 0,
  autoContinueOnHostCalls: false,
  serviceId: parseInt("0x00000000", 16),
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
    setServiceId(state, action) {
      state.serviceId = action.payload;
    },
    setSpiProgram(state, action: { payload: SpiProgram }) {
      state.spiProgram = action.payload;
    },
    setSpiArgs(state, action: { payload: Uint8Array }) {
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
    setHostCallsTrace(state, action: { payload: string | null }) {
      if (action.payload === null || action.payload.trim() === "") {
        state.hostCallsTrace = null;
      } else {
        const parsed = parseTrace(action.payload);
        state.hostCallsTrace = {
          rawContent: action.payload,
          parsed,
        };
        // reset host call index
        state.nextHostCallIndex = 0;
        state.pendingHostCall = null;
      }
    },
    setPendingHostCall(
      state,
      action: {
        payload: {
          pendingHostCall: HostCallPaused | null;
          nextHostCallIndex: number;
        };
      },
    ) {
      state.pendingHostCall = action.payload.pendingHostCall;
      state.nextHostCallIndex = action.payload.nextHostCallIndex;
    },
    setAutoContinueOnHostCalls(state, action: { payload: boolean }) {
      state.autoContinueOnHostCalls = action.payload;
    },
    resetHostCallIndex(state) {
      state.nextHostCallIndex = 0;
      state.pendingHostCall = null;
    },
  },
});

export const {
  setIsProgramInvalid,
  setBreakpointAddresses,
  setClickedInstruction,
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
  setHostCallsTrace,
  setPendingHostCall,
  setAutoContinueOnHostCalls,
  resetHostCallIndex,
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
export const selectHostCallsTrace = (state: RootState) => state.debugger.hostCallsTrace;
export const selectAutoContinueOnHostCalls = (state: RootState) => state.debugger.autoContinueOnHostCalls;

export default debuggerSlice.reducer;
