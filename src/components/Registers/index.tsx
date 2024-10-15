import { ExpectedState, InitialState, RegistersArray, Status } from "@/types/pvm";
import { useContext } from "react";
import { NumeralSystem } from "@/context/NumeralSystem";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { valueToNumeralSystem } from "@/components/Instructions/utils.tsx";
import classNames from "classnames";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input.tsx";
import { getStatusColor } from "./utils";
import { useAppSelector } from "@/store/hooks.ts";
import { selectWorkers, WorkerState } from "@/store/workers/workersSlice.ts";

const ComputedValue = ({
  propName,
  propNameIndex,
  value,
  previousValue,
  workers,
}: {
  propName: keyof ExpectedState;
  propNameIndex?: number;
  value?: number;
  previousValue?: number;
  workers: WorkerState[];
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const valuesInAllWorkers = workers.map((worker) =>
    propNameIndex ? (worker.currentState[propName] as RegistersArray)[propNameIndex] : worker.currentState[propName],
  );
  const isEqualAcrossWorkers = valuesInAllWorkers.every((val) => val === value);

  if (isEqualAcrossWorkers && previousValue === value) {
    return (
      <p
        className={classNames({
          "flex-[3]": true,
          "text-blue-500": value !== previousValue,
        })}
      >
        {value !== undefined ? valueToNumeralSystem(value, numeralSystem) : ""}
      </p>
    );
  }

  return (
    <div className="flex-[3]">
      <div
        className={classNames({
          "flex-[3]": true,
          "text-blue-500": value !== previousValue,
          "text-red-500": !isEqualAcrossWorkers,
        })}
      >
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span>
                {value !== undefined ? (isEqualAcrossWorkers ? valueToNumeralSystem(value, numeralSystem) : "?") : ""}
              </span>
            </TooltipTrigger>
            {isEqualAcrossWorkers && (
              <TooltipContent>
                <span>{valueToNumeralSystem(previousValue, numeralSystem)}</span>
                <span> → </span>
                <span>{valueToNumeralSystem(value, numeralSystem)}</span>
              </TooltipContent>
            )}
            {!isEqualAcrossWorkers && (
              <TooltipContent>
                {/*  show worker name and the value */}
                {workers.map((worker, index) => (
                  <div key={index}>
                    <span>{worker.id}</span>
                    <span>: </span>
                    <span>
                      {valueToNumeralSystem(
                        propNameIndex
                          ? (worker.currentState[propName] as RegistersArray)[propNameIndex]
                          : (worker.currentState[propName] as number),
                        numeralSystem,
                      )}
                    </span>
                  </div>
                ))}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export const Registers = ({
  currentState,
  currentAlternativeState,
  previousState,
  onCurrentStateChange,
  allowEditing,
}: {
  currentState: ExpectedState;
  currentAlternativeState: ExpectedState;
  previousState: ExpectedState;
  onCurrentStateChange: (changedState: ExpectedState) => void;
  allowEditing: boolean;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const workers = useAppSelector(selectWorkers);

  console.log({
    currentState,
    currentAlternativeState,
    previousState,
  });

  return (
    <div className="border-2 rounded-md h-full">
      <div className="p-3">
        <div>
          <div className="font-mono flex flex-col items-start">
            <div className="flex flex-row items-center justify-between w-full mb-2">
              <p className="flex-[2]">PC</p>
              <ComputedValue value={currentState.pc} previousValue={previousState.pc} propName="pc" workers={workers} />
            </div>
            <div className="flex flex-row items-center justify-between w-full mb-2">
              <p className="flex-[2]">Gas</p>
              <ComputedValue
                value={currentState.gas}
                previousValue={previousState.gas}
                propName="gas"
                workers={workers}
              />
            </div>
            <div className="flex flex-row items-center justify-between w-full">
              <p className="flex-[2]">Status</p>
              <p className="flex-[3]" style={{ color: getStatusColor(currentState.status) }} test-id="program-status">
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
                ) : (
                  <ComputedValue
                    value={currentState.regs?.[regNo]}
                    previousValue={previousState.regs?.[regNo]}
                    propName="regs"
                    propNameIndex={regNo}
                    workers={workers}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
