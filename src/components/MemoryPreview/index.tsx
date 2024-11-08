import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageMemory } from "./PageMemory";
import { RangeMemory } from "./RangeMemory";
import { useAppDispatch } from "@/store/hooks.ts";
import { changeRangeAllWorkers } from "@/store/workers/workersSlice.ts";
export type MemoryPreviewProps = {
  onPageChange: (page: number) => void;
  onRangeChange: (start: number, end: number) => void;
};
export const MemoryPreview = () => {
  const dispatch = useAppDispatch();

  return (
    <div className="border-2 rounded-md overflow-auto h-[70vh]">
      <Tabs defaultValue="pages" className="h-full flex flex-col">
        <TabsContent className="m-3 h-auto" value="pages">
          <PageMemory />
        </TabsContent>
        <TabsContent className="" value="ranges">
          <RangeMemory onRangeChange={(start, end) => dispatch(changeRangeAllWorkers({ start, end }))} />
        </TabsContent>
        <TabsList className="">
          <TabsTrigger className="w-1/2" value="pages">
            Pages
          </TabsTrigger>
          <TabsTrigger className="w-1/2" value="ranges">
            Ranges
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
