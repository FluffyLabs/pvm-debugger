import { debounce, isNumber } from "lodash";
import { useSelector } from "react-redux";
import { loadMemoryChunkAllWorkers, selectMemoryForFirstWorker } from "@/store/workers/workersSlice.ts";
import { valueToNumeralSystem } from "../Instructions/utils";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { useAppDispatch } from "@/store/hooks";
import classNames from "classnames";
import { NumericFormat } from "react-number-format";
import { INPUT_STYLES } from "../ui/input";
import { isSerializedError, LOAD_MEMORY_CHUNK_SIZE } from "@/store/utils";
import { logger } from "@/utils/loggerService";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
// import { useInView } from "react-intersection-observer";

const MAX_ADDRESS = Math.pow(2, 32);
const SPLIT_STEP = 8;
const MemoryRow = ({
  address,
  bytes,
  style,
  selectedAddress,
}: {
  address: number;
  bytes: number[];
  selectedAddress: number | null;
  style: React.CSSProperties;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);

  return (
    <div className="flex" style={style}>
      <div className="opacity-40 mr-4 min-w-[60px]" style={{ fontVariantNumeric: "tabular-nums" }}>
        {valueToNumeralSystem(address, numeralSystem, numeralSystem ? 2 : 3)
          .toString()
          .padStart(numeralSystem ? 0 : 6, "0")}
      </div>
      <div className="font-mono font-medium grow flex justify-around">
        {bytes.map((byte, index) => (
          <span key={index} className={`mr-[1px] ${(index + 1) % 2 === 0 ? "text-gray-700" : "text-gray-950"}`}>
            <span
              className={classNames({
                "bg-orange-400": isNumber(selectedAddress) && selectedAddress === address + index,
              })}
            >
              {valueToNumeralSystem(byte, numeralSystem, numeralSystem ? 2 : 3, false)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

const MemoryTable = ({
  hasError,
  loadMoreItems,
  selectedAddress,
}: {
  hasError: boolean;
  loadMoreItems: (startIndex: number, stopIndex: number) => void;
  selectedAddress: number | null;
}) => {
  // const beforeInView = useInView();
  // const afterInView = useInView();
  const memory = useSelector(selectMemoryForFirstWorker);
  const parentRef = useRef<HTMLDivElement>(null);

  // const startAddress = memory?.startAddress || 0;
  const hasPrevPage = (memory?.startAddress || 0) > 0;
  const hasNextPage = (memory?.stopAddress || 0) < MAX_ADDRESS;

  // Total number of items including potential loading placeholders
  const itemCount = (memory.data?.length || 0) + (hasPrevPage ? 1 : 0) + (hasNextPage ? 1 : 0);

  // Virtualizer setup
  const rowVirtualizer = useWindowVirtualizer({
    count: itemCount,
    scrollMargin: 100, // FIXME
    estimateSize: () => 24, // Height of each row
    overscan: 5,
    getItemKey: useCallback(
      (index: number) => {
        return memory.data?.[index]?.address || index;
      },
      [memory.data],
    ),
  });

  // Function to determine if an item is loaded
  const isItemLoaded = (index: number) => {
    if (hasPrevPage && index === 0) {
      return false;
    }

    if (hasNextPage && index === itemCount - 1) {
      return false;
    }

    return true;
  };

  // Load more items when reaching the start or end
  useEffect(() => {
    const [startIndex, endIndex] = rowVirtualizer
      .getVirtualItems()
      .reduce(
        ([min, max], item) => [Math.min(min, item.index), Math.max(max, item.index)],
        [Number.MAX_VALUE, Number.MIN_VALUE],
      );

    if (hasPrevPage && startIndex <= 5 && !isItemLoaded(startIndex)) {
      loadMoreItems(startIndex, startIndex + 20);
    } else if (hasNextPage && endIndex >= itemCount - 6 && !isItemLoaded(endIndex)) {
      loadMoreItems(endIndex - 20, endIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowVirtualizer.getVirtualItems()]);

  // Scroll to selected address
  useEffect(() => {
    if (isNumber(selectedAddress)) {
      const rowAddress = Math.floor((selectedAddress - (memory?.startAddress || 0)) / SPLIT_STEP);
      const index = rowAddress + (hasPrevPage ? 1 : 0);
      rowVirtualizer.scrollToIndex(index, { align: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress]);

  return (
    <div className={classNames("mt-4 grow", { "opacity-20": hasError })} ref={parentRef} style={{ overflow: "auto" }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const index = virtualRow.index;
          const style: React.CSSProperties = {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          };

          if (!isItemLoaded(index)) {
            return (
              <div key={virtualRow.key} className="text-center text-gray-400" style={style}>
                Loading memory chunk...
              </div>
            );
          }

          // Adjust index to account for loaders
          const memoryIndex = index - (hasPrevPage ? 1 : 0);
          const { address, bytes } = (memory.data || [])[memoryIndex];

          return (
            <MemoryRow
              key={virtualRow.key}
              style={style}
              address={address}
              bytes={bytes}
              selectedAddress={selectedAddress}
            />
          );
        })}
      </div>
    </div>
  );
};

export const MemoryPreview = () => {
  const memory = useSelector(selectMemoryForFirstWorker);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);

  const jumpToAddress = debounce(async (address: number) => {
    try {
      // Place requested address in the middle and index first address in the row
      const steppedAddress = address - (address % SPLIT_STEP);
      const halfChunkSize = LOAD_MEMORY_CHUNK_SIZE / 2;
      const startAddress = steppedAddress - halfChunkSize < 0 ? 0 : steppedAddress - halfChunkSize;
      const stopAddress = Math.min(MAX_ADDRESS, steppedAddress + halfChunkSize);
      await dispatch(loadMemoryChunkAllWorkers({ startAddress, stopAddress, loadType: "replace" })).unwrap();
      setSelectedAddress(address);
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message || "Unknown error");
      } else {
        setError("Unknown error");
      }
    }
  }, 1500);

  const loadMoreItems = async (startIndex: number) => {
    logger.info("Load more memory items", startIndex);
    try {
      if (startIndex === 0 && memory?.startAddress) {
        // We want one less than current start address
        const stopAddress = (memory?.startAddress || 0) - 1;
        const startAddress = Math.max(stopAddress - LOAD_MEMORY_CHUNK_SIZE, 0);
        await dispatch(
          loadMemoryChunkAllWorkers({
            startAddress,
            stopAddress,
            loadType: "start",
          }),
        ).unwrap();
        return;
      } else {
        // We want one more than current stop address
        const startAddress = (memory?.stopAddress || 0) + 1;
        const stopAddress = Math.min(startAddress + LOAD_MEMORY_CHUNK_SIZE, MAX_ADDRESS);
        await dispatch(
          loadMemoryChunkAllWorkers({
            startAddress,
            stopAddress,
            loadType: "end",
          }),
        ).unwrap();
      }
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
      <div className="flex w-full">
        <div className="font-semibold flex items-center mr-6">Jump to address (DEC)</div>
        <div className="flex-grow">
          <NumericFormat
            className={INPUT_STYLES}
            allowNegative={false}
            decimalScale={0}
            min={0}
            defaultValue={selectedAddress}
            required
            onChange={(ev) => {
              if (ev.target.value === "") {
                setSelectedAddress(null);
                return;
              }
              setError(null);
              jumpToAddress(parseInt(ev.target.value));
            }}
          />
        </div>
      </div>
      {error && <div className="text-red-500 mt-3">{error}</div>}
      <MemoryTable selectedAddress={selectedAddress} hasError={!!error} loadMoreItems={loadMoreItems} />
    </div>
  );
};
