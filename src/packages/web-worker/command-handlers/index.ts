import { runInit } from "./init";
import { runLoad } from "./load";
import { runStep } from "./step";
import { runMemory } from "./memory";
import { runHostCall } from "./host-call.ts";
import { runSetState } from "./set-state.ts";
import { runSetMemory } from "./set-memory.ts";

export default {
  runInit,
  runLoad,
  runStep,
  runMemory,
  runHostCall,
  runSetState,
  runSetMemory,
};
