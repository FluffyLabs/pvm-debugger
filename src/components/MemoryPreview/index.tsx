import { isNumber } from "lodash";
import { useSelector } from "react-redux";
import {
  loadMemoryChunkAllWorkers,
  selectIsAnyWorkerLoading,
  selectMemoryForFirstWorker,
  selectWorkers,
  WorkerState,
} from "@/store/workers/workersSlice.ts";
import { valueToNumeralSystem } from "../Instructions/utils";
import { ChangeEvent, useCallback, useContext, useEffect, useRef, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import classNames from "classnames";
import { INPUT_STYLES } from "../ui/input";
import { isSerializedError, LOAD_MEMORY_CHUNK_SIZE, MEMORY_SPLIT_STEP } from "@/store/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useInView } from "react-intersection-observer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from "@/components/ui/tooltip.tsx";
import React from "react";
import { NumeralSystem } from "@/context/NumeralSystem";

const MAX_ADDRESS = Math.pow(2, 32);
const ITEM_SIZE = 24;

const BG_COLOR = "#22cccc";

const MemoryCell = ({
  value,
  address,
  selectedAddress,
  index,
}: {
  value: number;
  address: number;
  selectedAddress: number | null;
  index: number;
}) => {
  const workers = useAppSelector(selectWorkers);
  const findMemoryForWorker = (worker: WorkerState) => worker.memory?.data?.find((mem) => mem.address === address);

  const addressInAllWorkers = workers.map((worker) => {
    const addressRow = findMemoryForWorker(worker);
    return addressRow?.bytes[index];
  });
  const { numeralSystem } = useContext(NumeralSystemContext);

  const isEqualAcrossWorkers = addressInAllWorkers.every((val) => val === value);

  return (
    <span
      key={index}
      className={classNames("relative mr-[1px]", {
        "text-gray-700": (index + 1) % 2 === 0,
        "text-gray-950": (index + 1) % 2 === 1,
        "opacity-50": isEqualAcrossWorkers && value === 0,
      })}
    >
      <span
        style={{
          backgroundColor: isNumber(selectedAddress) && selectedAddress === address + index ? BG_COLOR : "initial",
        }}
        className={classNames({
          "text-red-500": !isEqualAcrossWorkers,
        })}
      >
        {isEqualAcrossWorkers ? (
          valueToNumeralSystem(value, numeralSystem, numeralSystem ? 2 : 3, false)
        ) : (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span>{numeralSystem ? "??" : "??? "}</span>
              </TooltipTrigger>

              <TooltipPortal>
                <TooltipContent>
                  <div className="font-mono grid grid-cols-[minmax(0,auto),minmax(0,auto)]">
                    {workers.map((worker) => (
                      <React.Fragment key={worker.id}>
                        <div>
                          <span>{worker.id}</span>
                        </div>
                        <div className="pl-3">
                          <span>
                            {valueToNumeralSystem(
                              findMemoryForWorker(worker)?.bytes[index],
                              numeralSystem,
                              numeralSystem ? 2 : 3,
                              false,
                            )}
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          </TooltipProvider>
        )}
      </span>
    </span>
  );
};

const addressFormatter = (address: number, numeralSystem: NumeralSystem) => {
  const addressDisplay = valueToNumeralSystem(address, numeralSystem, numeralSystem ? 2 : 3, false)
    .toString()
    .padStart(6, "0");

  return numeralSystem ? `0x${addressDisplay}` : addressDisplay;
};

// Some info about react-virtual and bi-directional scrolling:
// https://medium.com/@rmoghariya7/reverse-infinite-scroll-in-react-using-tanstack-virtual-11a1fea24042
// https://stackblitz.com/edit/tanstack-query-xrw3fp
const MemoryRow = ({
  address,
  bytes,
  selectedAddress,
  addressLength,
}: {
  address: number;
  bytes: number[];
  selectedAddress: number | null;
  addressLength: number;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const displayAddress = addressFormatter(address, numeralSystem);

  return (
    <>
      <div
        className="opacity-40"
        style={{
          fontVariantNumeric: "tabular-nums",
          width: `${addressLength}ch`,
        }}
      >
        {displayAddress}
      </div>
      <div className="font-mono font-medium pl-1">
        {bytes.map((byte, index) => (
          <MemoryCell value={byte} address={address} selectedAddress={selectedAddress} index={index} key={index} />
        ))}
      </div>
    </>
  );
};

const MemoryTable = ({
  hasError,
  loadMoreItems,
  selectedAddress,
}: {
  hasError: boolean;
  loadMoreItems: (side: "prev" | "next") => Promise<void>;
  selectedAddress: number | null;
}) => {
  const beforeInView = useInView();
  const afterInView = useInView();
  const memoryInView = useInView();

  const [isLoading, setIsLoading] = useState(false);
  const memory = useSelector(selectMemoryForFirstWorker);
  const parentRef = useRef<HTMLDivElement>(null);
  const { numeralSystem } = useContext(NumeralSystemContext);
  const hasPrevPage = !!memory && (memory.startAddress || 0) > 0;
  const hasNextPage = !!memory && (memory.stopAddress || 0) < MAX_ADDRESS;
  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: memory?.data?.length || 0,
    enabled: memoryInView.inView,
    getScrollElement: () => parentRef.current,
    scrollMargin: 100,
    estimateSize: () => ITEM_SIZE,
    overscan: 5,
    getItemKey: useCallback(
      (index: number) => {
        return memory?.data ? memory.data[index].address : 0;
      },
      [memory?.data],
    ),
  });

  useEffect(() => {
    if (beforeInView.inView && !isLoading) {
      setIsLoading(true);
      loadMoreItems("prev").then(() => {
        // Force scroll for backwards scrolling. This is a workaround for a virtualizer.
        const offset = (rowVirtualizer.scrollOffset || 0) + (LOAD_MEMORY_CHUNK_SIZE / MEMORY_SPLIT_STEP) * ITEM_SIZE;
        rowVirtualizer.scrollOffset = offset;
        rowVirtualizer.calculateRange();
        rowVirtualizer.scrollToOffset(offset, { align: "start" });
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beforeInView.inView]);

  useEffect(() => {
    if (afterInView.inView && !isLoading) {
      setIsLoading(true);
      loadMoreItems("next").then(() => {
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [afterInView.inView]);

  // Scroll to selected address
  useEffect(() => {
    if (isNumber(selectedAddress)) {
      const steppedAddress = selectedAddress - (selectedAddress % MEMORY_SPLIT_STEP);

      const rowAddress = Math.floor((steppedAddress - (memory?.startAddress || 0)) / MEMORY_SPLIT_STEP);
      const index = rowAddress;
      rowVirtualizer.scrollToIndex(index, { align: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress]);

  if (!memory?.data) {
    return <div className="text-center m-6">Memory not initialized.</div>;
  }

  return (
    <div className={classNames("mt-4 grow h-full overflow-auto", { "opacity-20": hasError })} ref={parentRef}>
      {hasPrevPage && (
        <div className="text-center w-full" ref={beforeInView.ref}>
          ...
        </div>
      )}
      <div
        ref={memoryInView.ref}
        className="w-full relative"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow, _, virtualRows) => {
          const index = virtualRow.index;
          const style: React.CSSProperties = {
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
          };

          // Not a real case, but required for TS
          if (!memory?.data) {
            return (
              <tr>
                <td>loading...</td>
              </tr>
            );
          }

          const { address, bytes } = memory.data[index];
          const lastAddressLength = addressFormatter(
            memory.data[virtualRows[virtualRows.length - 1].index].address,
            numeralSystem,
          ).length;

          return (
            <div
              style={style}
              className="top-0 left-0 flex absolute"
              data-index={index}
              ref={rowVirtualizer.measureElement}
              key={virtualRow.key}
            >
              <MemoryRow
                address={address}
                bytes={bytes}
                selectedAddress={selectedAddress}
                addressLength={lastAddressLength}
              />
            </div>
          );
        })}
      </div>
      {hasNextPage && (
        <div className="text-center w-full" ref={afterInView.ref}>
          ...
        </div>
      )}
    </div>
  );
};

export const MemoryPreview = () => {
  const memory = useSelector(selectMemoryForFirstWorker);
  const isAnyWorkerLoading = useSelector(selectIsAnyWorkerLoading);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAnyWorkerLoading) {
      setSelectedAddress(null);
    }
  }, [isAnyWorkerLoading]);

  const jumpToAddress = async (address: number) => {
    try {
      // Place requested address in the middle and index first address in the row
      const steppedAddress = address - (address % MEMORY_SPLIT_STEP);
      const halfChunkSize = LOAD_MEMORY_CHUNK_SIZE / 2;
      const startAddress = steppedAddress - halfChunkSize < 0 ? 0 : steppedAddress - halfChunkSize;
      const stopAddress = Math.min(MAX_ADDRESS, steppedAddress + halfChunkSize);
      await dispatch(loadMemoryChunkAllWorkers({ startAddress, stopAddress, loadType: "replace" })).unwrap();
      setSelectedAddress(address);
      setError(null);
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message || "Unknown error");
      } else {
        setError("Unknown error");
      }
    }
  };

  const loadMoreItems = async (side: "prev" | "next") => {
    try {
      if (isAnyWorkerLoading) {
        return;
      }
      if (side === "prev" && memory) {
        const stopAddress = memory.startAddress;
        const startAddress = Math.max(stopAddress - LOAD_MEMORY_CHUNK_SIZE, 0);
        await dispatch(
          loadMemoryChunkAllWorkers({
            startAddress,
            stopAddress,
            loadType: "start",
          }),
        ).unwrap();
        return;
      } else if (side === "next" && memory) {
        const startAddress = memory.stopAddress;
        const stopAddress = Math.min(startAddress + LOAD_MEMORY_CHUNK_SIZE, MAX_ADDRESS);
        await dispatch(
          loadMemoryChunkAllWorkers({
            startAddress,
            stopAddress,
            loadType: "end",
          }),
        ).unwrap();
      }

      setError(null);
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message || "Unknown error");
      } else {
        setError("Unknown error");
      }
    }
  };

  return (
    <div className="border-2 rounded-md overflow-auto h-[70vh] p-5 flex flex-col">
      <JumpInput
        value={selectedAddress !== null ? selectedAddress.toString() : ""}
        onChange={async (address: number | null) => {
          if (address === null) {
            setSelectedAddress(address);
            return;
          }

          await jumpToAddress(address);
          setSelectedAddress(address);
        }}
      />
      <MemoryTable selectedAddress={selectedAddress} hasError={!!error} loadMoreItems={loadMoreItems} />
      {error && <div className="text-red-500 mt-3">{error}</div>}
    </div>
  );
};

type JumpInputProps = {
  value: string;
  onChange: (v: number | null) => void;
};
export function JumpInput({ value, onChange }: JumpInputProps) {
  const [input, setInput] = useState(value);
  const [isValid, setIsValid] = useState(true);

  const changeValue = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      const val = ev.currentTarget.value;
      setInput(val);
      const num = Number(val);
      const isEmpty = val === "" || val.match(/^\s+$/) !== null;
      const isValid = !Number.isNaN(num) && !isEmpty && num > -1 && (num & 0xffff_ffff) >>> 0 === num;
      setIsValid(isValid || isEmpty);
      if (isValid) {
        onChange(num);
      }
      if (isEmpty) {
        onChange(null);
      }
    },
    [onChange],
  );

  return (
    <>
      <input
        className={classNames(INPUT_STYLES.replace("focus-visible:ring-ring", ""), "w-full", {
          "ring-2 ring-red-500": !isValid,
          "focus-visible:ring-ring": isValid,
          "focus-visible:ring-red-500": !isValid,
        })}
        placeholder="Jump to address"
        value={input}
        onChange={changeValue}
      />
    </>
  );
}
