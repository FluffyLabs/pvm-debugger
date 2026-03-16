import { Navigate } from "react-router";

export function DebuggerPage() {
  // No orchestrator yet — redirect to load
  return <Navigate to="/load" replace />;
}
