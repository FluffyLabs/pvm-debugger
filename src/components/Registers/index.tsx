import { ExpectedState, InitialState, RegistersArray, Status } from "@/types/pvm";
import { ReactNode, useContext } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import { valueToNumeralSystem } from "@/components/Instructions/utils.tsx";
import classNames from "classnames";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input.tsx";
import { useAppSelector } from "@/store/hooks.ts";
import { selectWorkers, WorkerState } from "@/store/workers/workersSlice.ts";
import React from "react";
import { isNumber } from "lodash";
import { getStatusColor } from "@/utils/colors";
import { useIsDarkMode } from "@/packages/ui-kit/DarkMode/utils";

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

  const getWorkerValueFromState = (worker: WorkerState, state: "currentState" | "previousState") => {
    return propNameIndex !== undefined
      ? (worker[state][propName] as RegistersArray)?.[propNameIndex]
      : (worker[state][propName] as number);
  };

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

  const sharedStyles = {
    "font-inconsolata text-base h-6": true,
  };

  if (isEqualAcrossWorkers && wasEqualAcrossWorkers && previousValue === value) {
    return (
      <p
        className={classNames(sharedStyles, {
          "opacity-60": value === 0 || value === 0n || value === "0",
        })}
      >
        {formatValueToDisplay(value)}
      </p>
    );
  }

  return (
    <div
      className={classNames(sharedStyles, {
        "text-brand-dark dark:text-brand": value !== previousValue,
        "text-red-500 dark:text-red-500": !isEqualAcrossWorkers,
      })}
    >
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span>{formatValueToDisplay(value, isEqualAcrossWorkers)}</span>
        </TooltipTrigger>

        <TooltipContent>
          <div className="grid grid-cols-[minmax(0,auto)_minmax(0,auto)]">
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
    <Input
      className="h-6 -mt-px font-inconsolata text-base text-center m-auto w-20 h-6 pt-0 pb-px px-[4px] text-brand-dark dark:text-brand border-transparent hover:border-input align-top"
      onChange={onChange}
      onKeyUp={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      value={valueToNumeralSystem(value ?? 0, numeralSystem)}
    />
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
  const isDarkMode = useIsDarkMode();

  return (
    <div className="border rounded-md overflow-auto bg-card h-full">
      <div className="font-poppins flex flex-col items-start text-xs">
        {/* Summary */}
        <table className="w-full table-fixed  text-center">
          <thead className="">
            <tr>
              <th className="border border-l-0 border-t-0 py-3 bg-title text-title-foreground rounded-ss">Status</th>
              <th className="border border-t-0 bg-title text-title-foreground">PC</th>
              <th className="border border-r-0 border-t-0 rounded-se bg-title text-title-foreground">Gas</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-l-0">
                {currentState.status !== undefined && previousState.status !== undefined && (
                  <ComputedValue
                    value={currentState.status}
                    previousValue={previousState.status}
                    propName="status"
                    formatter={(value) => (
                      <span
                        className={"py-1 px-4 rounded-xl lowercase border"}
                        style={getStatusStyles(isDarkMode, Number(value))}
                        test-id="program-status"
                      >
                        {Status[Number(value)] ?? `Invalid(${value})`}
                      </span>
                    )}
                    workers={workers}
                  />
                )}
              </td>
              <td className="border py-2 text-center">
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
              </td>
              <td className="border border-r-0">
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
              </td>
            </tr>
          </tbody>
        </table>

        {/* Registers */}
        <table className="table-fixed mx-5 mt-3">
          <tbody>
            {currentState.regs?.map((_: unknown, regNo: number) => (
              <tr key={regNo} className="h-[30px]">
                <td className="pr-6">
                  ω<sub>{regNo}</sub>
                </td>
                {allowEditingRegisters ? (
                  <td className="">
                    <Input
                      className="w-20 m-0 p-0"
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
                  </td>
                ) : (
                  <td>
                    <ComputedValue
                      value={currentState.regs?.[regNo]}
                      previousValue={previousState.regs?.[regNo]}
                      propName="regs"
                      propNameIndex={regNo}
                      workers={workers}
                      padStartVal={numeralSystem ? 16 : 0}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function getStatusStyles(isDarkMode?: boolean, status?: Status) {
  const { background, color, border } = getStatusColor(isDarkMode, status);
  return {
    backgroundColor: background,
    color,
    borderColor: border,
  };
}

function stringToNumber<T>(value: string, cb: (x: string) => T): T {
  try {
    return cb(value);
  } catch {
    return cb("0");
  }
}
