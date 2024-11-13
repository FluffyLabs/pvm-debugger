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
import { isSerializedError, LOAD_MEMORY_CHUNK_SIZE, MEMORY_SPLIT_STEP } from "@/store/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useInView } from "react-intersection-observer";

const MAX_ADDRESS = Math.pow(2, 32);
const ITEM_SIZE = 24;

const MemoryRow = ({
  address,
  bytes,
  selectedAddress,
}: {
  address: number;
  bytes: number[];
  selectedAddress: number | null;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);

  return (
    <div className="flex">
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
  loadMoreItems: (side: "prev" | "next") => Promise<void>;
  selectedAddress: number | null;
}) => {
  const beforeInView = useInView();
  const afterInView = useInView();
  const [isLoading, setIsLoading] = useState(false);
  const memory = useSelector(selectMemoryForFirstWorker);
  const parentRef = useRef<HTMLDivElement>(null);

  const hasPrevPage = (memory?.startAddress || 0) > 0;
  const hasNextPage = (memory?.stopAddress || 0) < MAX_ADDRESS;
  const itemCount = memory.data?.length || 0;

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => parentRef.current,
    scrollMargin: 100,
    estimateSize: () => ITEM_SIZE,
    overscan: 5,
    getItemKey: useCallback(
      (index: number) => {
        return memory.data ? memory.data[index].address : 0;
      },
      [memory.data],
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

  return (
    <div
      className={classNames("mt-4 grow h-full", { "opacity-20": hasError })}
      ref={parentRef}
      style={{ overflow: "auto" }}
    >
      {hasPrevPage && (
        <div className="text-center w-full" ref={beforeInView.ref}>
          Loading prev page...
        </div>
      )}

      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
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
            transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
          };

          // Not a real case, but required for TS
          if (!memory.data) {
            return;
          }

          const { address, bytes } = memory.data[index];
          return (
            <div style={style} data-index={index} ref={rowVirtualizer.measureElement} key={virtualRow.key}>
              <MemoryRow key={virtualRow.key} address={address} bytes={bytes} selectedAddress={selectedAddress} />
            </div>
          );
        })}
      </div>
      {hasNextPage && (
        <div className="text-center w-full" ref={afterInView.ref}>
          Loading next page...
        </div>
      )}
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
      const steppedAddress = address - (address % MEMORY_SPLIT_STEP);
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

  const loadMoreItems = async (side: "prev" | "next") => {
    try {
      if (side === "prev" && memory?.startAddress) {
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
      } else if (side === "next") {
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
