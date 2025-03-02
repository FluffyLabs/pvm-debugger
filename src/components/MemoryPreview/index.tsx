import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryInfinite } from "./MemoryInfinite";
import { MemoryRanges } from "./MemoryRanges";

export const MemoryPreview = () => {
  return (
    <div className="border-2 rounded-md h-full bg-card">
      <Tabs defaultValue="pages" className="h-full flex flex-col">
        <TabsList className="bg-transparent m-2 mb-0 max-sm:hidden border dark:border-brand p-0">
          <TabsTrigger
            className="w-1/2 h-full bg-title text-secondary-foreground data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-brand dark:data-[state=active]:text-background"
            value="pages"
          >
            Infinite
          </TabsTrigger>
          <TabsTrigger
            className="w-1/2 h-full bg-title dark:bg-transparent dark:text-brand text-secondary-foreground data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-brand dark:data-[state=active]:text-background"
            value="ranges"
          >
            Ranges
          </TabsTrigger>
        </TabsList>
        <TabsContent className="m-3 mt-0 h-full overflow-hidden" value="pages">
          <MemoryInfinite />
        </TabsContent>
        <TabsContent value="ranges">
          <MemoryRanges />
        </TabsContent>
      </Tabs>
    </div>
  );
};
