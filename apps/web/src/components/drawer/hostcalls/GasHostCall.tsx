import type { HostCallInfo } from "@pvmdbg/types";

interface GasHostCallProps {
  info: HostCallInfo;
}

export function GasHostCall({ info }: GasHostCallProps) {
  const { currentState, resumeProposal } = info;
  const currentGas = currentState.gas;
  const omega7 = currentState.registers[7];

  const pendingGas = resumeProposal?.gasAfter;
  const pendingRegs = resumeProposal?.registerWrites;
  const pendingOmega7 = pendingRegs?.get(7);

  return (
    <div data-testid="gas-host-call" className="flex flex-col gap-2 text-xs">
      <h4 className="text-sm font-semibold text-foreground">Gas Information</h4>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
        <span className="text-muted-foreground">Current gas:</span>
        <span className="text-foreground">{currentGas.toString()}</span>

        <span className="text-muted-foreground">ω7 (gas context):</span>
        <span className="text-foreground">{omega7?.toString() ?? "—"}</span>
      </div>

      {resumeProposal && (
        <>
          <div className="border-t border-border my-1" />
          <h4 className="text-sm font-semibold text-foreground">Pending Effects</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
            {pendingGas !== undefined && (
              <>
                <span className="text-muted-foreground">Gas after:</span>
                <span className="text-amber-400">{pendingGas.toString()}</span>
              </>
            )}
            {pendingOmega7 !== undefined && (
              <>
                <span className="text-muted-foreground">ω7 ←:</span>
                <span className="text-amber-400">{pendingOmega7.toString()}</span>
              </>
            )}
            {pendingGas === undefined && pendingOmega7 === undefined && (
              <span className="text-muted-foreground col-span-2">No pending effects from trace.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
