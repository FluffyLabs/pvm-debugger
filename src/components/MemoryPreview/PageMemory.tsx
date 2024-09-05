import { Store } from "@/AppProviders";
import { Input } from "@/components/ui/input";
import { chunk } from "lodash";
import { useContext } from "react";
import { MemoryPreviewProps } from ".";

const SPLIT_STEP = 8 as const;

const toMemoryPageTabData = (memoryPage: Uint8Array | undefined, pageNumber: number) => {
  return chunk(memoryPage || [], SPLIT_STEP).map((chunk, index) => {
    console.log("dddd", pageNumber, index);
    return {
      // TODO add address
      address: (index * SPLIT_STEP + pageNumber * SPLIT_STEP).toString().padStart(6, "0"),
      bits: chunk.map((byte) => byte.toString().padStart(3, "0")),
    };
  });
};
export const PageMemory = ({ onPageChange }: MemoryPreviewProps) => {
  const memory = useContext(Store).memory;

  const data = toMemoryPageTabData(memory.page.state.data, memory.page.state.pageNumber);
  return (
    <div>
      <div className="grid grid-cols-3">
        <div className="font-semibold flex items-center">Page</div>
        <div className="col-span-2">
          <Input
            type="number"
            onChange={(ev) => {
              console.log(ev.target.value);
              onPageChange(parseInt(ev.target.value || "-1"));
            }}
          />
        </div>
      </div>
      <div className="mt-5">
        {data.map(({ address, bits }) => (
          <div className="grid grid-cols-3" key={address}>
            <div className="opacity-40">{address}</div>
            <div className="col-span-2 font-semibold">{bits.join(" ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
