import { chunk, debounce } from "lodash";
import { useSelector } from "react-redux";
import { changePageAllWorkers, selectMemoryForFirstWorker } from "@/store/workers/workersSlice.ts";
import { valueToNumeralSystem } from "../Instructions/utils";
import { useContext, useState } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { NumeralSystem } from "@/context/NumeralSystem";
import { useAppDispatch } from "@/store/hooks";
import classNames from "classnames";
import { NumericFormat } from "react-number-format";
import { INPUT_STYLES } from "../ui/input";
import { isSerializedError } from "@/store/utils";

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

export const MemoryTable = ({
  data,
  addressStart,
  hasError,
}: {
  addressStart: number;
  data: Uint8Array | undefined;
  hasError: boolean;
}) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const tableData = toMemoryPageTabData(data, addressStart, numeralSystem);

  return (
    <div className={classNames("mt-4 max-h-[calc(70vh-150px)] overflow-y-auto", { "opacity-20": hasError })}>
      {tableData.map(({ address, bytes }, rowIndex) => (
        <div className="flex" key={address}>
          <div className="opacity-40 mr-6" style={{ fontVariantNumeric: "tabular-nums" }}>
            {address}
          </div>
          <div className="font- font-mono grow">
            {bytes.map((byte, index) => (
              <span
                key={index + rowIndex}
                className={`mr-[1px] ${(index + rowIndex) % 2 === 0 ? "text-gray-700" : "text-gray-950"}`}
              >
                {byte}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const PageMemory = () => {
  // TODO: get the memory for all of them and compare results
  const memory = useSelector(selectMemoryForFirstWorker);
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);

  const changePage = debounce(async (pageNumber: number) => {
    if (pageNumber === undefined) {
      return;
    }
    try {
      await dispatch(changePageAllWorkers(pageNumber)).unwrap();
    } catch (error) {
      if (error instanceof Error || isSerializedError(error)) {
        setError(error.message || "Unknown error");
      } else {
        setError("Unknown error");
      }
    }
  }, 500);
  return (
    <div>
      <div className="flex w-full">
        <div className="font-semibold flex items-center mr-6">Page</div>
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
                setError("Page number is required");
                return;
              }
              changePage(parseInt(ev.target.value));
            }}
          />
        </div>
      </div>
      {error && <div className="text-red-500 mt-3">{error}</div>}
      <MemoryTable
        hasError={!!error}
        data={memory?.page.data}
        addressStart={(memory?.page.pageNumber || 0) * (memory?.meta.pageSize || 0)}
      />
    </div>
  );
};
