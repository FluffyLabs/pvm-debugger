import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryInfinite } from "./MemoryInfinite";
import { MemoryRanges } from "./MemoryRanges";

export const MemoryPreview = () => {
  return (
    <div className="border-2 rounded-md min-h-64 h-full max-h-[70vh]">
      <Tabs defaultValue="pages" className="h-full flex flex-col">
        <TabsList className="bg-transparent m-1">
          <TabsTrigger
            className="w-1/2 bg-gray-100 data-[state=active]:bg-black data-[state=active]:text-white"
            value="pages"
          >
            Infinite
          </TabsTrigger>
          <TabsTrigger
            className="w-1/2 bg-gray-100 data-[state=active]:bg-black data-[state=active]:text-white"
            value="ranges"
          >
            Ranges
          </TabsTrigger>
        </TabsList>
        <TabsContent className="m-3 h-auto" value="pages">
          <MemoryInfinite />
        </TabsContent>
        <TabsContent className="" value="ranges">
          <MemoryRanges />
        </TabsContent>
      </Tabs>
    </div>
  );
};
