import { Routes, Route, Navigate } from "react-router";
import { Header, AppsSidebar, Content } from "@fluffylabs/shared-ui";
import { initManifest } from "@pvmdbg/content";
import { OrchestratorProvider } from "./context/orchestrator";
import { LoadPage } from "./pages/LoadPage";
import { DebuggerPage } from "./pages/DebuggerPage";
import manifest from "@fixtures/examples.json";

// Initialize the examples manifest once at module load
initManifest(manifest);

export default function App() {
  return (
    <OrchestratorProvider>
      <div className="app-shell" data-testid="app-shell">
        <Header toolNameSrc="" ghRepoName="pvm-debugger" />
        <div className="app-body">
          <AppsSidebar activeLink="debugger" enableDarkModeToggle />
          <Content className="app-content">
            <Routes>
              <Route path="/" element={<DebuggerPage />} />
              <Route path="/load" element={<LoadPage />} />
              <Route path="*" element={<Navigate to="/load" replace />} />
            </Routes>
          </Content>
        </div>
      </div>
    </OrchestratorProvider>
  );
}
