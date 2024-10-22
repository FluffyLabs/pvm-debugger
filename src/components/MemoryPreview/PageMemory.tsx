import { Input } from "@/components/ui/input";
import { chunk } from "lodash";
import { useSelector } from "react-redux";
import { selectMemoryForFirstWorker } from "@/store/workers/workersSlice.ts";

const SPLIT_STEP = 8 as const;
const toMemoryPageTabData = (memoryPage: Uint8Array | undefined, addressStart: number) => {
  return chunk(memoryPage || [], SPLIT_STEP).map((chunk, index) => {
    return {
      address: (index * SPLIT_STEP + addressStart).toString().padStart(6, "0"),
      bits: chunk.map((byte) => byte.toString().padStart(3, "0")),
    };
  });
};

export const MemoryTable = ({ data, addressStart }: { addressStart: number; data: Uint8Array | undefined }) => {
  const tableData = toMemoryPageTabData(data, addressStart);

  return (
    <div className="mt-5 max-h-[calc(70vh-150px)] overflow-y-auto">
      {tableData.map(({ address, bits }) => (
        <div className="grid grid-cols-3" key={address}>
          <div className="opacity-40">{address}</div>
          <div className="col-span-2 font-semibold">{bits.join(" ")}</div>
        </div>
      ))}
    </div>
  );
};

export const PageMemory = ({ onPageChange }: { onPageChange: (page: number) => void }) => {
  // TODO: get the memory for all of them and compare results
  const memory = useSelector(selectMemoryForFirstWorker);
  console.log({
    memory,
  });

  return (
    <div>
      <div className="flex w-full">
        <div className="font-semibold flex items-center mr-6 ml-3">Page</div>
        <div className="flex-grow">
          <Input
            type="number"
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
