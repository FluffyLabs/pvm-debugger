import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Orchestrator } from "@pvmdbg/orchestrator";
import type { ProgramEnvelope } from "@pvmdbg/types";
import { createPvmAdapter } from "../lib/runtime";
import { installDevBridge } from "../lib/dev-bridge";

export interface OrchestratorContextValue {
  orchestrator: Orchestrator | null;
  envelope: ProgramEnvelope | null;
  setEnvelope: (envelope: ProgramEnvelope) => void;
  initialize: (pvmIds: string[]) => Orchestrator;
  teardown: () => void;
}

export const OrchestratorContext = createContext<OrchestratorContextValue>({
  orchestrator: null,
  envelope: null,
  setEnvelope: () => {},
  initialize: () => {
    throw new Error("OrchestratorProvider not mounted");
  },
  teardown: () => {},
});

export function OrchestratorProvider({ children }: { children: ReactNode }) {
  const [orchestrator, setOrchestrator] = useState<Orchestrator | null>(null);
  const [envelope, setEnvelope] = useState<ProgramEnvelope | null>(null);
  const orchestratorRef = useRef<Orchestrator | null>(null);

  const teardown = useCallback(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.shutdown().catch(() => {});
      orchestratorRef.current = null;
      setOrchestrator(null);
      setEnvelope(null);
    }
  }, []);

  const initialize = useCallback(
    (pvmIds: string[]): Orchestrator => {
      // Tear down any prior instance
      teardown();

      const orch = new Orchestrator();
      for (const id of pvmIds) {
        orch.addPvm(createPvmAdapter(id));
      }
      orchestratorRef.current = orch;
      setOrchestrator(orch);
      return orch;
    },
    [teardown],
  );

  // Install dev bridge for E2E testing (no-op in production)
  useEffect(() => {
    installDevBridge(() => orchestratorRef.current);
  }, []);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.shutdown().catch(() => {});
      }
    };
  }, []);

  return (
    <OrchestratorContext.Provider value={{ orchestrator, envelope, setEnvelope, initialize, teardown }}>
      {children}
    </OrchestratorContext.Provider>
  );
}
