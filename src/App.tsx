import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { Header } from "@/components/Header";
import { useAppSelector } from "@/store/hooks.ts";
import { DebuggerControlls } from "./components/DebuggerControlls";
import DebuggerContent from "@/pages/DebuggerContent.tsx";
import ProgramLoader from "@/pages/ProgramLoader.tsx";
import { Navigate, Route, Routes } from "react-router";

function App() {
  const { pvmInitialized } = useAppSelector((state) => state.debugger);

  return (
    <>
      <Header />
      <div className="p-3 text-left w-screen">
        <div className="flex flex-col gap-5">
          <div className="grid grid-rows md:grid-cols-12 gap-1.5 pt-2">
            <div className="col-span-12 flex justify-center"> {pvmInitialized ? <DebuggerControlls /> : null}</div>

            <Routes>
              <Route index element={pvmInitialized ? <DebuggerContent /> : <Navigate to={"/load"} />} />
              <Route path="load" element={<ProgramLoader />} />
            </Routes>
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default App;
