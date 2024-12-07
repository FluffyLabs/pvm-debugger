import { createSlice } from "@reduxjs/toolkit";
import { CurrentInstruction, ExpectedState } from "@/types/pvm.ts";
import { InstructionMode } from "@/components/Instructions/types.ts";
import { RootState } from "@/store";

export interface DebuggerState {
  program: number[];
  initialState: ExpectedState;
  isProgramEditMode: boolean;
  isAsmError: boolean;
  isRunMode: boolean;
  isStepMode: boolean;
  programPreviewResult: CurrentInstruction[];
  breakpointAddresses: number[];
  clickedInstruction: CurrentInstruction | null;
  instructionMode: InstructionMode;
  isDebugFinished: boolean;
  pvmInitialized: boolean;
  stepsToPerform: number;
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
  isAsmError: false,
  isRunMode: false,
  isStepMode: false,
  programPreviewResult: [],
  breakpointAddresses: [],
  clickedInstruction: null,
  instructionMode: InstructionMode.ASM,
  isDebugFinished: false,
  pvmInitialized: false,
  stepsToPerform: 1,
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
    setIsAsmError(state, action) {
      state.isAsmError = action.payload;
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
  },
});

export const {
  setProgram,
  setInitialState,
  setIsProgramEditMode,
  setIsAsmError,
  setIsRunMode,
  setIsStepMode,
  setProgramPreviewResult,
  setBreakpointAddresses,
  setClickedInstruction,
  setInstructionMode,
  setIsDebugFinished,
  setPvmInitialized,
  setStepsToPerform,
} = debuggerSlice.actions;

export const selectProgram = (state: RootState) => state.debugger.program;
export const selectInitialState = (state: RootState) => state.debugger.initialState;
export const selectIsProgramEditMode = (state: RootState) => state.debugger.isProgramEditMode;
export const selectIsAsmError = (state: RootState) => state.debugger.isAsmError;
export const selectIsRunMode = (state: RootState) => state.debugger.isRunMode;
export const selectProgramPreviewResult = (state: RootState) => state.debugger.programPreviewResult;
export const selectBreakpointAddresses = (state: RootState) => state.debugger.breakpointAddresses;
export const selectClickedInstruction = (state: RootState) => state.debugger.clickedInstruction;
export const selectInstructionMode = (state: RootState) => state.debugger.instructionMode;
export const selectIsDebugFinished = (state: RootState) => state.debugger.isDebugFinished;
export const selectPvmInitialized = (state: RootState) => state.debugger.pvmInitialized;

export default debuggerSlice.reducer;
