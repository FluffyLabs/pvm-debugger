import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageMemory } from "./PageMemory";
import { RangeMemory } from "./RangeMemory";
import { useMemoryFeature } from "./hooks/memoryFeature";

export type MemoryPreviewProps = {
  onPageChange: (page: number) => void;
  onRangeChange: (start: number, end: number) => void;
};
export const MemoryPreview = () => {
  const feature = useMemoryFeature();
  return (
    <div className="border-2 rounded-md min-h-64 h-full">
      <Tabs defaultValue="pages" className="m-1">
        <TabsList>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="ranges">Ranges</TabsTrigger>
        </TabsList>
        <TabsContent className="m-2" value="pages">
          <PageMemory onPageChange={(pageNumber) => feature.actions.changePage(pageNumber)} />
        </TabsContent>
        <TabsContent className="m-2" value="ranges">
          <RangeMemory onRangeChange={(start, end) => feature.actions.changeRange(start, end)} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
