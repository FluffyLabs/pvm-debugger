import type { HostCallInfo } from "@pvmdbg/types";
import { useEffect } from "react";
import { useStableCallback } from "../../../hooks/useStableCallback";
import type { HostCallEffects } from "../../../lib/fetch-utils";

interface GasHostCallProps {
  info: HostCallInfo;
  onEffectsReady: (effects: HostCallEffects) => void;
}

export function GasHostCall({ info, onEffectsReady }: GasHostCallProps) {
  const { currentState } = info;
  const currentGas = currentState.gas;

  const stableOnEffects = useStableCallback(onEffectsReady);

  // Auto-report φ₇ = currentGas on mount
  useEffect(() => {
    stableOnEffects({
      registerWrites: new Map([[7, currentGas]]),
      memoryWrites: [],
    });
  }, [currentGas, stableOnEffects]);

  return (
    <div data-testid="gas-host-call" className="flex flex-col gap-2 text-xs">
      <p className="text-muted-foreground">
        Returns current gas counter in φ₇.
      </p>
      <div className="font-mono">
        <span className="text-muted-foreground">Current gas: </span>
        <span className="text-foreground">{currentGas.toString()}</span>
      </div>
    </div>
  );
}
