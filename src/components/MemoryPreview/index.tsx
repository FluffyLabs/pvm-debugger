import { chunk, debounce } from "lodash";
import { useSelector } from "react-redux";
import { loadMemoryChunkAllWorkers, selectMemoryForFirstWorker } from "@/store/workers/workersSlice.ts";
import { valueToNumeralSystem } from "../Instructions/utils";
import { useContext, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { NumeralSystem } from "@/context/NumeralSystem";
import { useAppDispatch } from "@/store/hooks";
import classNames from "classnames";
import { NumericFormat } from "react-number-format";
import { INPUT_STYLES } from "../ui/input";
import { isSerializedError } from "@/store/utils";
import InfiniteLoader from "react-window-infinite-loader";
import { FixedSizeList } from "react-window";
import AutoSizer, { Size } from "react-virtualized-auto-sizer";

const SPLIT_STEP = 8 as const;
const toMemoryPageTabData = (
  memoryPage: Uint8Array | undefined,
  addressStart: number,
  numeralSystem: NumeralSystem,
) => {
  return chunk(memoryPage || [], SPLIT_STEP).map((chunk, index) => {
    return {
      address: (index * SPLIT_STEP + addressStart).toString().padStart(6, "0"),
      bytes: chunk.map((byte) => valueToNumeralSystem(byte, numeralSystem, numeralSystem ? 2 : 3, false)),
    };
  });
};

const MemoryRow = ({ address, bytes, style }: { address: string; bytes: string[]; style: React.CSSProperties }) => {
  return (
    <div className="flex" style={style}>
      <div className="opacity-40 mr-6" style={{ fontVariantNumeric: "tabular-nums" }}>
        {address}
      </div>
      <div className="font-mono font-medium">
        {bytes.map((byte, index) => (
          <span key={index} className={`mr-[1px] ${(index + 1) % 2 === 0 ? "text-gray-700" : "text-gray-950"}`}>
            {byte}
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
}: {
  tableData: { address: string; bytes: string[] }[];
  hasError: boolean;
  loadMoreItems: (startIndex: number, stopIndex: number) => void;
}) => {
  const itemCount = tableData.length + 1;

  const Item = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (index + 1 >= itemCount) {
      return <div style={style}>Loading...</div>;
    }

    const { address, bytes } = tableData[index];
    return <MemoryRow style={style} address={address} bytes={bytes} />;
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
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const goToAddress = debounce(async (_address: number) => {
    try {
      await dispatch(loadMemoryChunkAllWorkers({ startAddress: 0, stopAddress: 100 })).unwrap();
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message || "Unknown error");
      } else {
        setError("Unknown error");
      }
    }
  }, 500);

  // TODO KF handle reverse scrolling
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadMoreItems = async (_startAddress: number, _stopAddress: number) => {
    try {
      const startAddress = memory?.stopAddress || 0;
      const step = 1000;
      await dispatch(
        loadMemoryChunkAllWorkers({ startAddress: startAddress, stopAddress: startAddress + step }),
      ).unwrap();
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message || "Unknown error");
      } else {
        setError("Unknown error");
      }
    }
  };

  const { numeralSystem } = useContext(NumeralSystemContext);
  const startAddress = memory?.startAddress || 0;
  const tableData = toMemoryPageTabData(memory?.data, startAddress, numeralSystem);

  return (
    <div className="border-2 rounded-md overflow-auto h-[70vh] p-5 flex flex-col">
      <div className="flex w-full">
        <div className="font-semibold flex items-center mr-6">Address</div>
        <div className="flex-grow">
          <NumericFormat
            className={INPUT_STYLES}
            allowNegative={false}
            decimalScale={0}
            min={0}
            defaultValue={0}
            required
            onChange={(ev) => {
              if (ev.target.value === "") {
                setError("Address is required");
                return;
              }
              goToAddress(parseInt(ev.target.value));
            }}
          />
        </div>
      </div>
      {error && <div className="text-red-500 mt-3">{error}</div>}
      <MemoryTable tableData={tableData} hasError={!!error} loadMoreItems={loadMoreItems} />
    </div>
  );
};
