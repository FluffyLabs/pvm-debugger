import { createSlice } from "@reduxjs/toolkit";
import { CurrentInstruction, DebuggerEcalliStorage, ExpectedState } from "@/types/pvm.ts";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { RootState } from "@/store";

export interface DebuggerState {
  isProgramInvalid: boolean;
  breakpointAddresses: number[];
  clickedInstruction: CurrentInstruction | null;
  hasHostCallOpen: boolean;
  initialState: ExpectedState;
  instructionMode: InstructionMode;
  isDebugFinished: boolean;
  isProgramEditMode: boolean;
  isRunMode: boolean;
  isStepMode: boolean;
  program: number[];
  programPreviewResult: CurrentInstruction[];
  pvmInitialized: boolean;
  stepsToPerform: number;
  storage: DebuggerEcalliStorage | null;
}

const initialState: DebuggerState = {
  program: [],
  initialState: {
    regs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pc: 0,
    pageMap: [],
    memory: [],
    gas: 10000n,
  },
  isProgramEditMode: false,
  isProgramInvalid: false,
  isRunMode: false,
  isStepMode: false,
  hasHostCallOpen: false,
  programPreviewResult: [],
  breakpointAddresses: [],
  clickedInstruction: null,
  instructionMode: InstructionMode.ASM,
  isDebugFinished: false,
  pvmInitialized: false,
  stepsToPerform: 1,
  storage: null,
};

const debuggerSlice = createSlice({
  name: "debugger",
  initialState,
  reducers: {
    setProgram(state, action) {
      state.program = action.payload;
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
    setStepsToPerform(state, action) {
      state.stepsToPerform = action.payload;
    },
    setHasHostCallOpen(state, action) {
      state.hasHostCallOpen = action.payload;
    },
    setStorage(state, action) {
      state.storage = action.payload;
    },
  },
});

export const {
  setIsProgramInvalid,
  setBreakpointAddresses,
  setClickedInstruction,
  setHasHostCallOpen,
  setInitialState,
  setInstructionMode,
  setIsDebugFinished,
  setIsProgramEditMode,
  setIsRunMode,
  setIsStepMode,
  setProgram,
  setProgramPreviewResult,
  setPvmInitialized,
  setStepsToPerform,
  setStorage,
} = debuggerSlice.actions;

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

export default debuggerSlice.reducer;
