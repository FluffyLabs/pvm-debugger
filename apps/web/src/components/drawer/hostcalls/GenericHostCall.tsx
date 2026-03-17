import type { HostCallInfo } from "@pvmdbg/types";

interface GenericHostCallProps {
  info: HostCallInfo;
}

const REGISTER_NAMES = [
  "ω0",
  "ω1",
  "ω2",
  "ω3",
  "ω4",
  "ω5",
  "ω6",
  "ω7",
  "ω8",
  "ω9",
  "ω10",
  "ω11",
  "ω12",
];

export function GenericHostCall({ info }: GenericHostCallProps) {
  const { currentState, resumeProposal } = info;
  const regs = currentState.registers;
  const pendingRegs = resumeProposal?.registerWrites;

  return (
    <div data-testid="generic-host-call" className="flex flex-col gap-2 text-xs">
      <p className="text-muted-foreground italic">
        No dedicated handler for this host call. Showing raw register state.
      </p>

      <h4 className="text-sm font-semibold text-foreground">Current Registers</h4>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 font-mono">
        {regs.map((val, i) => (
          <div key={i} className="contents">
            <span className="text-muted-foreground">{REGISTER_NAMES[i]}:</span>
            <span className="text-foreground">{val.toString()}</span>
          </div>
        ))}
      </div>

      {resumeProposal && pendingRegs && pendingRegs.size > 0 && (
        <>
          <div className="border-t border-border my-1" />
          <h4 className="text-sm font-semibold text-foreground">Pending Effects (from trace)</h4>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 font-mono">
            {[...pendingRegs.entries()].map(([idx, val]) => (
              <div key={idx} className="contents">
                <span className="text-muted-foreground">{REGISTER_NAMES[idx] ?? `r${idx}`} ←:</span>
                <span className="text-amber-400">{val.toString()}</span>
              </div>
            ))}
          </div>
          {resumeProposal.memoryWrites.length > 0 && (
            <p className="text-muted-foreground">
              + {resumeProposal.memoryWrites.length} memory write(s)
            </p>
          )}
          {resumeProposal.gasAfter !== undefined && (
            <p className="text-muted-foreground font-mono">
              Gas after: <span className="text-amber-400">{resumeProposal.gasAfter.toString()}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
