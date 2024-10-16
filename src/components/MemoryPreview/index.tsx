import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageMemory } from "./PageMemory";
import { RangeMemory } from "./RangeMemory";
import { useAppDispatch } from "@/store/hooks.ts";
import { changePageAllWorkers, changeRangeAllWorkers } from "@/store/workers/workersSlice.ts";

export type MemoryPreviewProps = {
  onPageChange: (page: number) => void;
  onRangeChange: (start: number, end: number) => void;
};
export const MemoryPreview = () => {
  const dispatch = useAppDispatch();

  return (
    <div className="border-2 rounded-md min-h-64 h-full max-h-[70vh]">
      <Tabs defaultValue="pages" className="m-1">
        <TabsList>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="ranges">Ranges</TabsTrigger>
        </TabsList>
        <TabsContent className="m-2" value="pages">
          <PageMemory onPageChange={(pageNumber) => dispatch(changePageAllWorkers(pageNumber))} />
        </TabsContent>
        <TabsContent className="m-2" value="ranges">
          <RangeMemory onRangeChange={(start, end) => dispatch(changeRangeAllWorkers({ start, end }))} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
