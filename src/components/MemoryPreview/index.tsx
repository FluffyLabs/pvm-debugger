import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryInfinite } from "./MemoryInfinite";
import { MemoryRanges } from "./MemoryRanges";

export const MemoryPreview = () => {
  return (
    <div className="border-2 rounded-md min-h-64 h-full max-h-[70vh]">
      <Tabs defaultValue="pages" className="h-full flex flex-col">
        <TabsContent className="m-3 h-auto" value="pages">
          <MemoryInfinite />
        </TabsContent>
        <TabsContent className="" value="ranges">
          <MemoryRanges />
        </TabsContent>
        <TabsList className="">
          <TabsTrigger className="w-1/2" value="pages">
            Infinite
          </TabsTrigger>
          <TabsTrigger className="w-1/2" value="ranges">
            Ranges
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
