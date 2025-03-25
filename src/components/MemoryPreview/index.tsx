import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryInfinite } from "./MemoryInfinite";
import { MemoryRanges } from "./MemoryRanges";
import { useState } from "react";
import { createEmptyRow } from "./MemoryRangesEmptyRow";

export const MemoryPreview = () => {
  const [ranges, setRanges] = useState([createEmptyRow()]);

  const triggerClass =
    "text-xs w-1/2 h-8 bg-title text-secondary-foreground dark:text-brand data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-brand dark:data-[state=active]:text-background rounded-se-none rounded-ee-none";
  return (
    <div className="border-[1px] rounded-md h-full bg-card">
      <Tabs defaultValue="pages" className="flex flex-col h-full">
        <TabsList className="bg-transparent p-0 m-4 mb-0 max-sm:hidden border dark:border-brand">
          <TabsTrigger className={triggerClass} value="pages">
            Infinite
          </TabsTrigger>
          <TabsTrigger className={triggerClass} value="ranges">
            Ranges
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pages" className="mb-4">
          <MemoryInfinite />
        </TabsContent>
        <TabsContent value="ranges" className="mb-4">
          <MemoryRanges ranges={ranges} setRanges={setRanges} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
