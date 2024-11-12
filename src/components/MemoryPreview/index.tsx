import { chunk, debounce, isNumber } from "lodash";
import { useSelector } from "react-redux";
import { loadMemoryChunkAllWorkers, selectMemoryForFirstWorker } from "@/store/workers/workersSlice.ts";
import { valueToNumeralSystem } from "../Instructions/utils";
import { useContext, useEffect, useRef, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { useAppDispatch } from "@/store/hooks";
import classNames from "classnames";
import { NumericFormat } from "react-number-format";
import { INPUT_STYLES } from "../ui/input";
import { isSerializedError, LOAD_MEMORY_CHUNK_SIZE } from "@/store/utils";
import InfiniteLoader from "react-window-infinite-loader";
import { FixedSizeList } from "react-window";
import AutoSizer, { Size } from "react-virtualized-auto-sizer";
import { logger } from "@/utils/loggerService";

const SPLIT_STEP = 8;
const MAX_ADDRESS = Math.pow(2, 32);

const toMemoryPageTabData = (memoryPage: Uint8Array | undefined, startAddress: number) => {
  return chunk(memoryPage || [], SPLIT_STEP).map((chunk, index) => {
    return {
      address: index * SPLIT_STEP + startAddress,
      bytes: chunk,
    };
  });
};

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
            {/* TODO KF Scroll into view */}
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
  const memory = useSelector(selectMemoryForFirstWorker);
  const listRef = useRef<FixedSizeList | null>(null);

  const startAddress = memory?.startAddress || 0;
  const tableData = toMemoryPageTabData(memory?.data, startAddress);
  const hasPrevPage = (memory?.startAddress || 0) > 0;
  const hasNextPage = (memory?.stopAddress || 0) < MAX_ADDRESS;
  // We want to add next and prev loaders if necessary
  const itemCount = tableData.length + (hasPrevPage ? 1 : 0) + (hasNextPage ? 1 : 0);
  const isItemLoaded = (index: number) => {
    if (hasPrevPage && index === 0) {
      return false;
    }

    if (hasNextPage && index === tableData.length - 1) {
      return false;
    }

    return true;
  };

  // useEffect(() => {
  //   console.log(tableData);
  // }, [tableData]);

  useEffect(() => {
    if (isNumber(selectedAddress)) {
      const rowAddress = Math.floor((selectedAddress - (memory?.startAddress || 0)) / 8);
      listRef.current?.scrollToItem(rowAddress, "center");
    }
  }, [memory?.startAddress, selectedAddress, tableData]);

  const Item = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (!isItemLoaded(index)) {
      return (
        <div className="text-center text-gray-400" style={style}>
          Loading memory chunk...
        </div>
      );
    }

    // We added one more item to the start as a loader
    const memoryIndex = index - (hasPrevPage ? 1 : 0);
    const { address, bytes } = tableData[memoryIndex];

    // TODO KF support hex selected address
    return <MemoryRow style={style} address={address} bytes={bytes} selectedAddress={selectedAddress} />;
  };

  return (
    <div className={classNames("mt-4 grow", { "opacity-20": hasError })}>
      <AutoSizer>
        {({ height, width }: Size) => {
          return (
            <InfiniteLoader
              isItemLoaded={isItemLoaded}
              itemCount={itemCount}
              loadMoreItems={(startIndex, stopIndex) => {
                loadMoreItems(startIndex, stopIndex);
              }}
            >
              {({ onItemsRendered, ref }) => {
                return (
                  <FixedSizeList
                    itemCount={itemCount}
                    onItemsRendered={onItemsRendered}
                    ref={(elem) => {
                      ref(elem);
                      listRef.current = elem;
                    }}
                    height={height}
                    itemSize={24}
                    width={width}
                  >
                    {Item}
                  </FixedSizeList>
                );
              }}
            </InfiniteLoader>
          );
        }}
      </AutoSizer>
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
      // Place requested address in the middle

      const halfChunkSize = LOAD_MEMORY_CHUNK_SIZE / 2;
      const startAddress = address - halfChunkSize < 0 ? 0 : address - halfChunkSize;
      const stopAddress = Math.min(MAX_ADDRESS, address + halfChunkSize);
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
