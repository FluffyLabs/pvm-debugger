import { DebuggerControlls } from "../DebuggerControlls";
import { NumeralSystemSwitch } from "../NumeralSystemSwitch";
import { Separator } from "../ui/separator";
// import { ControllsDrawer } from "./ControllsDrawer";

export const MobileDebuggerControls = () => {
  return (
    <div>
      {/* <ControllsDrawer /> */}
      <div className="flex items-center bg-secondary p-2">
        <DebuggerControlls />
        <Separator className="w-1" orientation="vertical" />
        <NumeralSystemSwitch className="" />
      </div>
    </div>
  );
};
