import { useContext } from "react";
import { OrchestratorContext, type OrchestratorContextValue } from "../context/orchestrator";

export function useOrchestrator(): OrchestratorContextValue {
  return useContext(OrchestratorContext);
}
