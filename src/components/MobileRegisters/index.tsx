import { ExpectedState, Status } from "@/types/pvm";
import { ArrowRight } from "lucide-react";
import { getStatusColor } from "../Registers";

export const MobileRegisters = ({
  currentState,
  previousState,
  isEnabled,
}: {
  currentState: ExpectedState;
  previousState: ExpectedState;
  isEnabled: boolean;
}) => {
  const changedRegisterIndex = currentState.regs?.findIndex((reg, i) => reg !== previousState.regs?.[i]);

  if (changedRegisterIndex === undefined || !isEnabled) {
    return <div className="border-2 rounded-md h-[80px] grid grid-cols-12 py-3 px-4"></div>;
  }

  return (
    <div className="border-2 rounded-md h-[80px] grid grid-cols-12 py-3 px-4">
      <div className="col-span-2 font-semibold">{currentState.pc !== previousState.pc && <>PC</>}</div>
      <div className="col-span-8 flex">
        {currentState.pc !== previousState.pc && (
          <>
            {currentState.pc} <ArrowRight className="mx-2" />
            <span className="text-blue-500">{previousState.pc}</span>
          </>
        )}
      </div>

      <div className="col-span-2 font-semibold text-right" style={{ color: getStatusColor(currentState.status) }}>
        {currentState.status !== undefined && Status[currentState.status]}
      </div>
      {changedRegisterIndex !== -1 && (
        <>
          <div className="col-span-2 font-semibold">ω{changedRegisterIndex}</div>
          <div className="col-span-8 flex">
            {previousState.regs?.[changedRegisterIndex]} <ArrowRight className="mx-2" />
            <span className="text-blue-500">{currentState.regs?.[changedRegisterIndex]}</span>
          </div>
        </>
      )}
    </div>
  );
};
