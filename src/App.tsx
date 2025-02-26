import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { Header } from "@/components/Header";
import { useAppSelector } from "@/store/hooks.ts";
import { DebuggerControlls } from "./components/DebuggerControlls";
import DebuggerContent from "@/pages/DebuggerContent.tsx";
import ProgramLoader from "@/pages/ProgramLoader.tsx";
import { Navigate, Route, Routes } from "react-router";
import { AppsSidebar } from "./packages/ui-kit/AppsSidebar";
import { MobileDebuggerControls } from "./components/MobileDebuggerControlls";

function App() {
  const { pvmInitialized } = useAppSelector((state) => state.debugger);

  return (
    <>
      <Header />
      <div className="flex justify-center h-full max-h-[calc(100vh-82px)] grow">
        {pvmInitialized ? <AppsSidebar /> : null}
        <div className="flex flex-col gap-5">
          <div className="mt-7 flex justify-center max-sm:hidden">
            {pvmInitialized ? (
              <div className="rounded-xl border">
                <DebuggerControlls />
              </div>
            ) : null}
          </div>

          <Routes>
            <Route index element={pvmInitialized ? <DebuggerContent /> : <Navigate to={"/load"} />} />
            <Route path="load" element={<ProgramLoader />} />
          </Routes>

          <div className="w-full bottom-0 left-0 sm:hidden">
            <MobileDebuggerControls />
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default App;
