import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const momoryPage = [
  { address: "000000", bits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { address: "000000", bits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { address: "000000", bits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
];
const PageMemory = () => {
  return (
    <div>
      <div className="grid grid-cols-3">
        <div className="font-semibold flex items-center">Page</div>
        <div className="col-span-2">
          <Input type="number" />
        </div>
      </div>
      <div className="mt-5">
        {momoryPage.map(({ address, bits }) => (
          <div className="grid grid-cols-3">
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
  memory: Uint8Array[];
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const MemoryPreview = (_props: MemoryPreviewProps) => {
  return (
    <div className="border-2 rounded-md min-h-64 h-full">
      <Tabs defaultValue="pages" className="m-1">
        <TabsList>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="ranges">Ranges</TabsTrigger>
        </TabsList>
        <TabsContent className="m-2" value="pages">
          <PageMemory />
        </TabsContent>
        <TabsContent className="m-2" value="ranges">
          Coming soon
        </TabsContent>
      </Tabs>
    </div>
  );
};
