import { Routes, Route, Navigate } from "react-router";
import { LoadScreen } from "./pages/LoadScreen";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/load" replace />} />
      <Route path="/load" element={<LoadScreen />} />
    </Routes>
  );
}
