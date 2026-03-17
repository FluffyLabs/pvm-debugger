import type { HostCallInfo } from "@pvmdbg/types";
import type { Orchestrator } from "@pvmdbg/orchestrator";
import { GasHostCall } from "./hostcalls/GasHostCall";
import { LogHostCall } from "./hostcalls/LogHostCall";
import { GenericHostCall } from "./hostcalls/GenericHostCall";

interface HostCallTabProps {
  activeHostCall: HostCallInfo | null;
  orchestrator: Orchestrator | null;
}

function HostCallHeader({ info }: { info: HostCallInfo }) {
  const { hostCallName, hostCallIndex, pvmId, currentState } = info;
  return (
    <div data-testid="host-call-header" className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-foreground">
          {hostCallName}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          index {hostCallIndex}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          PVM: {pvmId}
        </span>
      </div>
      <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
        <span>PC: 0x{currentState.pc.toString(16)}</span>
        <span>Gas: {currentState.gas.toString()}</span>
      </div>
      <p
        data-testid="host-call-hint"
        className="text-xs text-muted-foreground italic"
      >
        Use Step, Run, or Next to continue execution.
      </p>
    </div>
  );
}

function ContextualView({
  info,
  orchestrator,
}: {
  info: HostCallInfo;
  orchestrator: Orchestrator | null;
}) {
  switch (info.hostCallIndex) {
    case 0:
      return <GasHostCall info={info} />;
    case 100:
      return <LogHostCall info={info} orchestrator={orchestrator} />;
    default:
      return <GenericHostCall info={info} />;
  }
}

export function HostCallTab({ activeHostCall, orchestrator }: HostCallTabProps) {
  if (!activeHostCall) {
    return (
      <div data-testid="host-call-tab" className="flex flex-col gap-2">
        <p data-testid="host-call-empty" className="text-xs text-muted-foreground italic">
          No host call is currently active.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="host-call-tab" className="flex flex-col gap-3">
      <HostCallHeader info={activeHostCall} />
      <div className="border-t border-border" />
      <ContextualView info={activeHostCall} orchestrator={orchestrator} />
    </div>
  );
}
