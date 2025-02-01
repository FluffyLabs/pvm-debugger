import { ExpectedState, InitialState, RegistersArray, Status } from "@/types/pvm";
import { ReactNode, useContext } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { valueToNumeralSystem } from "@/components/Instructions/utils.tsx";
import classNames from "classnames";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input.tsx";
import { useAppSelector } from "@/store/hooks.ts";
import { selectWorkers, WorkerState } from "@/store/workers/workersSlice.ts";
import React from "react";
import { isNumber } from "lodash";
import { getStatusColor } from "@/components/Registers/utils.ts";

const ComputedValue = ({
  propName,
  propNameIndex,
  value,
  previousValue,
  formatter,
  padStartVal = 0,
  workers,
}: {
  propName: keyof ExpectedState;
  propNameIndex?: number;
  value?: number | string | bigint;
  previousValue?: number | string | bigint;
  formatter?: (value: number | string | bigint) => ReactNode | string;
  padStartVal?: number;
  workers: WorkerState[];
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);

  const getWorkerValueFromState = (worker: WorkerState, state: "currentState" | "previousState") =>
    propNameIndex !== undefined
      ? (worker[state][propName] as RegistersArray)[propNameIndex]
      : (worker[state][propName] as number);

  const valuesInAllWorkers = (state: "currentState" | "previousState") =>
    workers.map((worker) => getWorkerValueFromState(worker, state));

  const isEqualAcrossWorkers = valuesInAllWorkers("currentState").every((val) => val === value);
  const wasEqualAcrossWorkers = valuesInAllWorkers("previousState").every((val) => val === previousValue);

  const formatValueToDisplay = (value?: number | string | bigint, isEqualAcrossWorkers = true) => {
    if (value === undefined) {
      return "";
    }

    if (!isEqualAcrossWorkers) {
      return "?";
    }

    if (isNumber(value) || typeof value === "bigint") {
      const numeralValue = valueToNumeralSystem(value, numeralSystem, padStartVal);
      return formatter ? formatter(numeralValue) : numeralValue;
    }

    return formatter ? formatter(value) : value;
  };

  if (isEqualAcrossWorkers && wasEqualAcrossWorkers && previousValue === value) {
    return (
      <p
        className={classNames({
          "flex-[3]": true,
          "pl-2": true,
          "opacity-60": value === 0 || value === 0n || value === "0",
        })}
      >
        {formatValueToDisplay(value)}
      </p>
    );
  }

  return (
    <div className="flex-[3] pl-2">
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
              <span>{formatValueToDisplay(value, isEqualAcrossWorkers)}</span>
            </TooltipTrigger>

            <TooltipContent>
              <div className="grid grid-cols-[minmax(0,auto),minmax(0,auto)]">
                {workers.map((worker, index) => (
                  <React.Fragment key={index}>
                    <div>
                      <span>{worker.id}</span>
                    </div>
                    <div className="pl-3">
                      <span>{formatValueToDisplay(getWorkerValueFromState(worker, "previousState"))}</span>
                      <span> → </span>
                      <span>{formatValueToDisplay(getWorkerValueFromState(worker, "currentState"))}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

const EditableField = ({
  onChange,
  value,
}: {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value?: number | bigint;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);

  return (
    <div className="flex-[3]">
      <Input
        className="w-20 h-6 m-0 py-0 px-[4px] text-md border-white hover:border-input"
        onChange={onChange}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        value={valueToNumeralSystem(value ?? 0, numeralSystem)}
      />
    </div>
  );
};

export const Registers = ({
  currentState,
  previousState,
  onCurrentStateChange,
  allowEditingPc,
  allowEditingGas,
  allowEditingRegisters,
}: {
  currentState: ExpectedState;
  previousState: ExpectedState;
  onCurrentStateChange: (changedState: ExpectedState) => void;
  allowEditingPc: boolean;
  allowEditingGas: boolean;
  allowEditingRegisters: boolean;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const workers = useAppSelector(selectWorkers);

  return (
    <div className="border-2 rounded-md h-[70vh] overflow-auto">
      <div className="p-3">
        <div>
          <div className="font-mono flex flex-col items-start text-xs">
            <div className="flex flex-row items-center justify-between w-full mb-2">
              <p className="flex-[2]">PC</p>
              {allowEditingPc ? (
                <EditableField
                  onChange={(e) => {
                    const value = e.target?.value;
                    const newValue = stringToNumber(value, Number);
                    onCurrentStateChange({
                      ...currentState,
                      pc: newValue,
                    });
                  }}
                  value={currentState.pc}
                />
              ) : (
                <ComputedValue
                  value={currentState.pc}
                  previousValue={previousState.pc}
                  propName="pc"
                  workers={workers}
                />
              )}
            </div>
            <div className="flex flex-row items-center justify-between w-full mb-2">
              <p className="flex-[2]">Gas</p>
              {allowEditingGas ? (
                <EditableField
                  onChange={(e) => {
                    const value = e.target?.value;
                    const newValue = BigInt(stringToNumber(value, Number));
                    onCurrentStateChange({
                      ...currentState,
                      gas: newValue,
                    });
                  }}
                  value={currentState.gas}
                />
              ) : (
                <ComputedValue
                  value={currentState.gas}
                  previousValue={previousState.gas}
                  propName="gas"
                  workers={workers}
                />
              )}
            </div>
            <div className="flex flex-row items-center justify-between w-full">
              <p className="flex-[2]">Status</p>
              {currentState.status !== undefined && previousState.status !== undefined && (
                <ComputedValue
                  value={currentState.status}
                  previousValue={previousState.status}
                  propName="status"
                  formatter={(value) => (
                    <span style={{ color: getStatusColor(Number(value)) }} test-id="program-status">
                      {Status[Number(value)] ?? `Invalid(${value})`}
                    </span>
                  )}
                  workers={workers}
                />
              )}
            </div>

            <hr className="w-full h-px mx-auto bg-gray-100 my-2" />

            {currentState.regs?.map((_: unknown, regNo: number) => (
              <div key={regNo} className="flex flex-row items-center w-full my-0.5">
                <p className="flex-[2]">
                  ω<sub>{regNo}</sub>
                </p>
                {allowEditingRegisters ? (
                  <div className="flex-[3]">
                    <Input
                      className="w-20 h-6 m-0 p-0"
                      onChange={(e) => {
                        const value = e.target?.value;
                        const newValue = stringToNumber(value, BigInt);
                        onCurrentStateChange({
                          ...currentState,
                          regs: currentState.regs?.map((val: bigint, index: number) =>
                            index === regNo ? newValue : val,
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
                    padStartVal={numeralSystem ? 16 : 0}
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

function stringToNumber<T>(value: string, cb: (x: string) => T): T {
  try {
    return cb(value);
  } catch (_e) {
    return cb("0");
  }
}
