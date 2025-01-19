import { NumeralSystem } from "@/context/NumeralSystem";
import { WorkerState } from "@/store/workers/workersSlice";
import { valueToNumeralSystem } from "../Instructions/utils";

export type FindMemoryForWorkerType = (
  worker: WorkerState,
  address: number,
) =>
  | {
      address: number;
      bytes: number[];
    }
  | undefined;

export const findMemoryForWorker: FindMemoryForWorkerType = (worker, address) =>
  worker.memory?.data?.find((mem) => mem.address === address);

export const addressFormatter = (address: number, numeralSystem: NumeralSystem) => {
  const addressDisplay = valueToNumeralSystem(address, numeralSystem, numeralSystem ? 2 : 3, false)
    .toString()
    .padStart(6, "0");

  return numeralSystem ? `0x${addressDisplay}` : addressDisplay;
};
