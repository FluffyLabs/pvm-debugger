import { ExpectedState } from "@/types/pvm";
import { HostCallResumeMode } from "@/store/workers/workersSlice";

export interface HostCallHandlerProps {
  /** Current state from the first worker */
  currentState: ExpectedState;
  /** Whether the handler is currently loading/processing */
  isLoading: boolean;
  /** Function to read memory from PVM */
  readMemory: (startAddress: number, length: number) => Promise<Uint8Array>;
  /** Function to resume execution */
  onResume: (mode: HostCallResumeMode, regs?: bigint[], gas?: bigint) => void;
  /** Function to close the dialog without resuming */
  onClose: () => void;
}

export interface HostCallHandler {
  /** The host call index this handler handles */
  index: number;
  /** Display name for the host call */
  name: string;
  /** Whether this handler shows custom UI (true) or uses default register editing (false) */
  hasCustomUI: boolean;
  /** The component to render for this host call */
  Component: React.ComponentType<HostCallHandlerProps>;
}
