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
      <div className="flex h-full max-h-[calc(100vh-82px)] grow">
        <AppsSidebar />

        <div className="flex justify-center grow">
          <div className="flex flex-col sm:gap-5 max-sm:w-full">
            {pvmInitialized ? (
              <div className="mt-5 flex justify-center max-sm:hidden">
                <div className="rounded-xl border">
                  <DebuggerControlls />
                </div>
              </div>
            ) : null}

            <Routes>
              <Route index element={pvmInitialized ? <DebuggerContent /> : <Navigate to={"/load"} />} />
              <Route path="load" element={<ProgramLoader />} />
            </Routes>

            {pvmInitialized ? (
              <div className="w-full bottom-0 left-0 sm:hidden">
                <MobileDebuggerControls />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ToastContainer />
    </>
  );
}

export default App;
