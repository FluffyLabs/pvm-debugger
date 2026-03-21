import { useState, useEffect, useRef, type ReactNode } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router";
import { Header, AppsSidebar, Content } from "@fluffylabs/shared-ui";
import { initManifest } from "@pvmdbg/content";
import { OrchestratorProvider } from "./context/orchestrator";
import { DebuggerSettingsProvider } from "./context/debugger-settings";
import { LoadPage } from "./pages/LoadPage";
import { DebuggerPage } from "./pages/DebuggerPage";
import { useOrchestrator } from "./hooks/useOrchestrator";
import { loadSettings } from "./lib/debugger-settings";
import {
  hasPersistedSession,
  restoreSession,
  clearProgramSession,
} from "./hooks/usePersistence";
import manifest from "@fixtures/examples.json";

// Initialize the examples manifest once at module load
initManifest(manifest);

/**
 * RestoreGate — renders a neutral loading screen while restoring a persisted
 * program session. Prevents the load wizard from flashing during restore.
 *
 * Cancellation-safe: a `cancelled` flag prevents state updates if the effect
 * is cleaned up (e.g. React Strict Mode double-invocation in dev).
 */
function RestoreGate({ children }: { children: ReactNode }) {
  const { initialize, setEnvelope } = useOrchestrator();
  const navigate = useNavigate();
  const [restoring, setRestoring] = useState(() => hasPersistedSession());
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!restoring || restoredRef.current) return;

    let cancelled = false;

    async function doRestore() {
      try {
        const envelope = restoreSession();
        if (cancelled) return;

        const settings = loadSettings();
        const orch = initialize(settings.selectedPvmIds);
        await orch.loadProgram(envelope);
        if (cancelled) return;

        if (envelope.trace) {
          for (const pvmId of settings.selectedPvmIds) {
            orch.setTrace(pvmId, envelope.trace);
          }
        }
        setEnvelope(envelope);
        restoredRef.current = true;
        setRestoring(false);
        navigate("/", { replace: true });
      } catch (err) {
        if (cancelled) return;
        console.error("Session restore failed:", err);
        clearProgramSession();
        restoredRef.current = true;
        setRestoring(false);
        navigate("/load", { replace: true });
      }
    }

    doRestore();

    return () => {
      cancelled = true;
    };
  }, [restoring, initialize, setEnvelope, navigate]);

  if (restoring) {
    return (
      <div data-testid="restore-gate" className="flex items-center justify-center h-full">
        <span className="text-sm text-muted-foreground">Restoring session...</span>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <DebuggerSettingsProvider>
    <OrchestratorProvider>
      <div className="app-shell" data-testid="app-shell">
        <Header toolNameSrc="/tool-name.svg" ghRepoName="pvm-debugger" />
        <div className="app-body">
          <AppsSidebar activeLink="debugger" enableDarkModeToggle />
          <Content className="app-content">
            <RestoreGate>
              <Routes>
                <Route path="/" element={<DebuggerPage />} />
                <Route path="/load" element={<LoadPage />} />
                <Route path="*" element={<Navigate to="/load" replace />} />
              </Routes>
            </RestoreGate>
          </Content>
        </div>
      </div>
    </OrchestratorProvider>
    </DebuggerSettingsProvider>
  );
}
