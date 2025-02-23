import { DebuggerControlls } from "../DebuggerControlls";
import { NumeralSystemSwitch } from "../NumeralSystemSwitch";
// import { ControllsDrawer } from "./ControllsDrawer";

export const MobileDebuggerControls = () => {
  return (
    <div>
      {/* <ControllsDrawer /> */}
      <div className="flex items-center bg-[#F6F6F6] p-2">
        <DebuggerControlls />
        <NumeralSystemSwitch className="" />
      </div>
    </div>
  );
};
