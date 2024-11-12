import { chunk, debounce } from "lodash";
import { useSelector } from "react-redux";
import { loadMemoryChunkAllWorkers, selectMemoryForFirstWorker } from "@/store/workers/workersSlice.ts";
import { valueToNumeralSystem } from "../Instructions/utils";
import { useContext, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { useAppDispatch } from "@/store/hooks";
import classNames from "classnames";
import { NumericFormat } from "react-number-format";
import { INPUT_STYLES } from "../ui/input";
import { isSerializedError, LOAD_MEMORY_CHUNK_SIZE } from "@/store/utils";
import InfiniteLoader from "react-window-infinite-loader";
import { FixedSizeList } from "react-window";
import AutoSizer, { Size } from "react-virtualized-auto-sizer";

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
            <span className={classNames({ "bg-orange-400": selectedAddress && selectedAddress === address + index })}>
              {valueToNumeralSystem(byte, numeralSystem, numeralSystem ? 2 : 3, false)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

const MemoryTable = ({
  tableData,
  hasError,
  loadMoreItems,
  selectedAddress,
}: {
  tableData: { address: number; bytes: number[] }[];
  hasError: boolean;
  loadMoreItems: (startIndex: number, stopIndex: number) => void;
  selectedAddress: number | null;
}) => {
  const itemCount = tableData.length + 1;

  const Item = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (index + 1 >= itemCount) {
      return <div style={style}>Loading...</div>;
    }

    const { address, bytes } = tableData[index];
    // TODO KF support hex selected address
    return <MemoryRow style={style} address={address} bytes={bytes} selectedAddress={selectedAddress} />;
  };

  const hasNextPage = true;
  const isItemLoaded = (index: number) => !hasNextPage || index < tableData.length;

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
                    ref={ref}
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
  const [selectedAddress, setSelectedAddress] = useState<number | null>(0);
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);

  const jumpToAddress = debounce(async (address: number) => {
    try {
      const halfChunkSize = LOAD_MEMORY_CHUNK_SIZE / 2;
      const startAddress = address - halfChunkSize < 0 ? 0 : address - halfChunkSize;
      const stopAddress = address + halfChunkSize > MAX_ADDRESS ? MAX_ADDRESS : address + halfChunkSize;

      await dispatch(loadMemoryChunkAllWorkers({ startAddress, stopAddress, loadType: "replace" })).unwrap();
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message || "Unknown error");
      } else {
        setError("Unknown error");
      }
    }
  }, 1500);

  // TODO KF handle reverse scrolling
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadMoreItems = async (_startAddress: number, _stopAddress: number) => {
    try {
      // We want one more than current stop address
      const startAddress = memory?.stopAddress || 0 + 1;
      await dispatch(
        loadMemoryChunkAllWorkers({
          startAddress: startAddress,
          stopAddress: startAddress + LOAD_MEMORY_CHUNK_SIZE,
          loadType: "end",
        }),
      ).unwrap();
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message || "Unknown error");
      } else {
        setError("Unknown error");
      }
    }
  };

  const startAddress = memory?.startAddress || 0;
  const tableData = toMemoryPageTabData(memory?.data, startAddress);

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
                setError("Address is required");
                setSelectedAddress(null);
                return;
              }
              setError(null);
              setSelectedAddress(parseInt(ev.target.value));
              jumpToAddress(parseInt(ev.target.value));
            }}
          />
        </div>
      </div>
      {error && <div className="text-red-500 mt-3">{error}</div>}
      <MemoryTable
        tableData={tableData}
        selectedAddress={selectedAddress}
        hasError={!!error}
        loadMoreItems={loadMoreItems}
      />
    </div>
  );
};
