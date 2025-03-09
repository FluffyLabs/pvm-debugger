import { ExpectedState, Status } from "@/types/pvm";
import { ArrowRight } from "lucide-react";
import { getStatusColor } from "../Registers/utils";
import { valueToNumeralSystem } from "../Instructions/utils";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { useContext } from "react";

export const MobileRegisters = ({
  currentState,
  previousState,
  isEnabled,
}: {
  currentState: ExpectedState;
  previousState: ExpectedState;
  isEnabled: boolean;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);

  const changedRegisterIndex = currentState.regs?.findIndex((reg, i) => reg !== previousState.regs?.[i]);

  if (changedRegisterIndex === undefined || !isEnabled) {
    return <div className="border-2 rounded-md h-[80px] grid grid-cols-12 py-3 px-4"></div>;
  }

  return (
    <div className="border-2 rounded-md h-[80px] grid grid-cols-12 py-3 px-4">
      <div className="col-span-2 font-semibold">PC</div>
      <div className="col-span-8 flex">
        {previousState.pc !== undefined ? valueToNumeralSystem(previousState.pc, numeralSystem) : ""}
        {currentState.pc !== previousState.pc && (
          <>
            <ArrowRight className="mx-2" />
            <span className="text-blue-500">
              {currentState.pc !== undefined ? valueToNumeralSystem(currentState.pc, numeralSystem) : ""}
            </span>
          </>
        )}
      </div>

      <div className={"col-span-2 font-semibold text-right " + getStatusColor(currentState.status || 0)}>
        {currentState.status !== undefined ? Status[currentState.status] : Status[0]}
      </div>
      {changedRegisterIndex !== -1 && (
        <>
          <div className="col-span-2 font-semibold">ω{changedRegisterIndex}</div>
          <div className="col-span-8 flex">
            {previousState.regs?.[changedRegisterIndex] !== undefined
              ? valueToNumeralSystem(previousState.regs?.[changedRegisterIndex], numeralSystem)
              : ""}
            <ArrowRight className="mx-2" />
            <span className="text-blue-500">
              {currentState.regs?.[changedRegisterIndex] !== undefined
                ? valueToNumeralSystem(currentState.regs?.[changedRegisterIndex], numeralSystem)
                : ""}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
