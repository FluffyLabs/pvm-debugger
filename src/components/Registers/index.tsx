import { ExpectedState, InitialState, Status } from "@/types/pvm";
import { useContext } from "react";
import { NumeralSystem, NumeralSystemContext } from "@/context/NumeralSystem.tsx";
import { valueToNumeralSystem } from "@/components/Instructions/utils.tsx";
import classNames from "classnames";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input.tsx";

export const getStatusColor = (status?: Status) => {
  if (status === Status.OK || status === Status.HALT) {
    return "#4caf50";
  }

  if (status === Status.PANIC) {
    return "#f44336";
  }

  return "#55b3f3";
};
export const Registers = ({
  currentState,
  previousState,
  onCurrentStateChange,
  allowEditing,
}: {
  currentState: ExpectedState;
  previousState: ExpectedState;
  onCurrentStateChange: (changedState: ExpectedState) => void;
  allowEditing: boolean;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);

  return (
    <div className="border-2 rounded-md h-full">
      <div className="p-3">
        <div>
          <div className="font-mono flex flex-col items-start">
            <div className="flex flex-row items-center justify-between w-full mb-2">
              <p className="flex-[2]">PC</p>
              <p
                className={classNames({
                  "flex-[3]": true,
                  "text-blue-500": currentState.pc !== previousState.pc,
                })}
              >
                {currentState.pc !== undefined ? valueToNumeralSystem(currentState.pc, numeralSystem) : ""}
              </p>
            </div>

            <div className="flex flex-row items-center justify-between w-full">
              <p className="flex-[2]">Status</p>
              <p className="flex-[3]" style={{ color: getStatusColor(currentState.status) }}>
                {currentState.status !== undefined ? Status[currentState.status] : null}
              </p>
            </div>

            <hr className="w-full h-px mx-auto bg-gray-100 my-2" />

            {currentState.regs?.map((_: unknown, regNo: number) => (
              <div key={regNo} className="flex flex-row items-center w-full my-0.5">
                <p className="flex-[2]">
                  ω<sub>{regNo}</sub>
                </p>
                {allowEditing ? (
                  <div className="flex-[3]">
                    <Input
                      className="w-20 h-6 m-0 p-0"
                      onChange={(e) => {
                        const value = e.target?.value;
                        const valueInDecimal =
                          numeralSystem === NumeralSystem.HEXADECIMAL ? `${parseInt(value, 16)}` : value;
                        const regValue =
                          valueInDecimal && !Number.isNaN(parseInt(valueInDecimal)) ? parseInt(valueInDecimal) : "";
                        onCurrentStateChange({
                          ...currentState,
                          regs: currentState.regs?.map((val: number, index: number) =>
                            index === regNo ? regValue : val,
                          ) as InitialState["regs"],
                        });
                      }}
                      onKeyUp={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      value={valueToNumeralSystem(currentState.regs?.[regNo] ?? 0, numeralSystem)}
                    />
                  </div>
                ) : currentState.regs?.[regNo] !== previousState.regs?.[regNo] ? (
                  <div className="flex-[3]">
                    <div
                      className={classNames({
                        "text-blue-500": currentState.regs?.[regNo] !== previousState.regs?.[regNo],
                      })}
                    >
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <span> {valueToNumeralSystem(currentState.regs?.[regNo] ?? 0, numeralSystem)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span>{valueToNumeralSystem(previousState.regs?.[regNo] ?? 0, numeralSystem)}</span>
                            <span> → </span>
                            <span>{valueToNumeralSystem(currentState.regs?.[regNo] ?? 0, numeralSystem)}</span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ) : (
                  <div
                    className={classNames({
                      "flex-[3]": true,
                      "opacity-20": currentState.regs?.[regNo] === 0,
                    })}
                  >
                    {valueToNumeralSystem(currentState.regs?.[regNo] ?? 0, numeralSystem)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
