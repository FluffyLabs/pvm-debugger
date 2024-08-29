import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { chunk } from "lodash";

// const momoryPage = [
//   { address: "000000", bits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
//   { address: "000000", bits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
//   { address: "000000", bits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
// ];

const SPLIT_STEP = 8 as const;

const toMemoryPageTabData = (memoryPage: Uint8Array | undefined) => {
  return chunk(memoryPage || [], SPLIT_STEP).map((chunk, index) => {
    return {
      // TODO add address
      address: (index * SPLIT_STEP).toString().padStart(6, "0"),
      bits: chunk.map((byte) => byte.toString().padStart(3, "0")),
    };
  });
};
const PageMemory = ({ memoryPage, onPageChange }: MemoryPreviewProps) => {
  const data = toMemoryPageTabData(memoryPage);
  return (
    <div>
      <div className="grid grid-cols-3">
        <div className="font-semibold flex items-center">Page</div>
        <div className="col-span-2">
          <Input type="number" onChange={(ev) => onPageChange(parseInt(ev.target.value || "0"))} />
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

type MemoryPreviewProps = {
  onPageChange: (page: number) => void;
  memoryPage: Uint8Array | undefined;
};
export const MemoryPreview = (props: MemoryPreviewProps) => {
  return (
    <div className="border-2 rounded-md min-h-64 h-full">
      <Tabs defaultValue="pages" className="m-1">
        <TabsList>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="ranges">Ranges</TabsTrigger>
        </TabsList>
        <TabsContent className="m-2" value="pages">
          <PageMemory memoryPage={props.memoryPage} onPageChange={props.onPageChange} />
        </TabsContent>
        <TabsContent className="m-2" value="ranges">
          Coming soon
        </TabsContent>
      </Tabs>
    </div>
  );
};
