import { Routes, Route, Navigate } from "react-router";
import { Header, AppsSidebar, Content } from "@fluffylabs/shared-ui";
import { LoadPage } from "./pages/LoadPage";
import { DebuggerPage } from "./pages/DebuggerPage";

export default function App() {
  return (
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
  );
}
