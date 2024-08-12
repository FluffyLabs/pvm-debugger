import { ExpectedState, InitialState, Status } from "@/types/pvm";
import ContentEditable from "react-contenteditable";
import { useContext } from "react";
import { NumeralSystem, NumeralSystemContext } from "@/context/NumeralSystem.tsx";
import { valueToNumeralSystem } from "@/components/Instructions/utils.tsx";
import classNames from "classnames";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
            {currentState.regs?.map((_: unknown, regNo: number) => (
              <div key={regNo} className="flex flex-row items-center w-full">
                <p className="flex-[2]">
                  ω<sub>{regNo}</sub>
                </p>
                {allowEditing ? (
                  <ContentEditable
                    className="flex-[3]"
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
                    html={valueToNumeralSystem(currentState.regs?.[regNo] ?? 0, numeralSystem)}
                  />
                ) : currentState.regs?.[regNo] !== previousState.regs?.[regNo] ? (
                  <div className="flex-[3]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={classNames({
                              "text-blue-500": currentState.regs?.[regNo] !== previousState.regs?.[regNo],
                            })}
                          >
                            {valueToNumeralSystem(currentState.regs?.[regNo] ?? 0, numeralSystem)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span>{valueToNumeralSystem(previousState.regs?.[regNo] ?? 0, numeralSystem)}</span>
                          <span> → </span>
                          <span>{valueToNumeralSystem(currentState.regs?.[regNo] ?? 0, numeralSystem)}</span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <div className="flex-[3]">{valueToNumeralSystem(currentState.regs?.[regNo] ?? 0, numeralSystem)}</div>
                )}
              </div>
            ))}

            <hr className="w-full h-px mx-auto bg-gray-100 my-2" />

            <div className="flex flex-row items-center justify-between w-full">
              <p className="flex-[2]">PC</p>
              <p className="flex-[3]">{currentState.pc}</p>
            </div>

            <hr className="w-full h-px mx-auto bg-gray-100 my-2" />

            <div className="flex flex-row items-center justify-between w-full">
              <p className="flex-[2]">Status</p>
              <p className="flex-[3]">{currentState.status !== undefined ? Status[currentState.status] : null}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
