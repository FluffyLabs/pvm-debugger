import { DebuggerControlls } from "../DebuggerControlls";
import { NumeralSystemSwitch } from "../NumeralSystemSwitch";
import { Separator } from "../ui/separator";
import { ControllsDrawer } from "./ControllsDrawer";
import { useAppSelector } from "@/store/hooks";

export const MobileDebuggerControls = () => {
  const { initialState } = useAppSelector((state) => state.debugger);
  const workers = useAppSelector((state) => state.workers);
  const { currentState, previousState } = workers[0] || {
    currentState: initialState,
    previousState: initialState,
  };

  return (
    <div className="relative h-[80px]">
      {/* Bottom Drawer */}
      <ControllsDrawer currentState={currentState} previousState={previousState} />

      {/* Main Controls */}
      <div className="absolute bottom-0 border-t w-full flex items-center bg-secondary p-2">
        <DebuggerControlls />
        <Separator className="h-[36px] mr-4" orientation="vertical" />
        <NumeralSystemSwitch className="mr-4" />
      </div>
    </div>
  );
};
