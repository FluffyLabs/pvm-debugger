import { Input } from "@/components/ui/input";
import { chunk } from "lodash";
import { useSelector } from "react-redux";
import { selectMemoryForFirstWorker } from "@/store/workers/workersSlice.ts";
import { valueToNumeralSystem } from "../Instructions/utils";
import { useContext } from "react";
import { NumeralSystemContext } from "@/context/NumeralSystemProvider";
import { NumeralSystem } from "@/context/NumeralSystem";

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

export const MemoryTable = ({ data, addressStart }: { addressStart: number; data: Uint8Array | undefined }) => {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const tableData = toMemoryPageTabData(data, addressStart, numeralSystem);

  return (
    <div className="mt-5 max-h-[calc(70vh-150px)] overflow-y-auto">
      {tableData.map(({ address, bytes }, rowIndex) => (
        <div className="flex" key={address}>
          <div className="opacity-40 mr-6 w-[50px]" style={{ fontVariantNumeric: "tabular-nums" }}>
            {address}
          </div>
          <div className="font-semibold grow">
            {bytes.map((byte, index) => (
              <span className={`mr-[1px] ${(index + rowIndex) % 2 === 0 ? "text-gray-700" : "text-gray-950"}`}>
                {byte}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const PageMemory = ({ onPageChange }: { onPageChange: (page: number) => void }) => {
  // TODO: get the memory for all of them and compare results
  const memory = useSelector(selectMemoryForFirstWorker);
  return (
    <div>
      <div className="flex w-full">
        <div className="font-semibold flex items-center mr-6">Page</div>
        <div className="flex-grow">
          <Input
            type="number"
            defaultValue={0}
            onChange={(ev) => {
              onPageChange(parseInt(ev.target.value || "-1"));
            }}
          />
        </div>
      </div>
      <MemoryTable
        data={memory?.page.data}
        addressStart={(memory?.page.pageNumber || 0) * (memory?.meta.pageSize || 0)}
      />
    </div>
  );
};
