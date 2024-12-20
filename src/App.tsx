import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { Header } from "@/components/Header";
import { PvmSelect } from "@/components/PvmSelect";
import { NumeralSystemSwitch } from "@/components/NumeralSystemSwitch";
import { useAppSelector } from "@/store/hooks.ts";
import { DebuggerControlls } from "./components/DebuggerControlls";
import classNames from "classnames";
import { DebuggerSettings } from "./components/DebuggerSettings";
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
            {pvmInitialized ? <DebuggerControlls /> : null}

            <div
              className={classNames("col-span-12 max-sm:order-first flex align-middle items-center justify-end", {
                "md:col-span-6": pvmInitialized,
              })}
            >
              <div className="mx-3">
                <DebuggerSettings />
              </div>

              <div className="w-full md:w-[350px]">
                <PvmSelect />
              </div>
              <NumeralSystemSwitch className="hidden md:flex ml-3" />
            </div>

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
