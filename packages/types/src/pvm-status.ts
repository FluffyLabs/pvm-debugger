/** All possible PVM execution statuses. */
export type PvmStatus =
  | "ok"
  | "halt"
  | "panic"
  | "fault"
  | "host"
  | "out_of_gas";

/** All valid PVM status values as a readonly array. */
export const PVM_STATUSES: readonly PvmStatus[] = [
  "ok",
  "halt",
  "panic",
  "fault",
  "host",
  "out_of_gas",
] as const;

/** PVM lifecycle states. */
export type PvmLifecycle =
  | "paused"
  | "running"
  | "paused_host_call"
  | "terminated"
  | "failed"
  | "timed_out";

/** Terminal lifecycle states where the PVM cannot step further. */
export const TERMINAL_LIFECYCLES: readonly PvmLifecycle[] = [
  "terminated",
  "failed",
  "timed_out",
] as const;

/** Check if a lifecycle state is terminal. */
export function isTerminal(lifecycle: PvmLifecycle): boolean {
  return (TERMINAL_LIFECYCLES as readonly string[]).includes(lifecycle);
}
