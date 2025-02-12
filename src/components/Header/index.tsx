import { Header as FluffyHeader } from "@/packages/ui-kit/Header";
import { DebuggerSettings } from "../DebuggerSettings";
import { PvmSelect } from "../PvmSelect";
import { NumeralSystemSwitch } from "../NumeralSystemSwitch";

const EndSlot = () => {
  return (
    <div className="text-white flex">
      <NumeralSystemSwitch className="hidden md:flex mx-7" />

      <div className="w-full md:w-[350px]">
        <PvmSelect />
      </div>

      <div className="mx-7">
        <DebuggerSettings />
      </div>
    </div>
  );
};
export const Header = () => {
  return <FluffyHeader endSlot={<EndSlot />} />;
};
