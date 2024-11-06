import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageMemory } from "./PageMemory";
import { RangeMemory } from "./RangeMemory";
import { useAppDispatch } from "@/store/hooks.ts";
import { changePageAllWorkers, changeRangeAllWorkers } from "@/store/workers/workersSlice.ts";
import { useState } from "react";
import { isString } from "lodash";

export type MemoryPreviewProps = {
  onPageChange: (page: number) => void;
  onRangeChange: (start: number, end: number) => void;
};
export const MemoryPreview = () => {
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  const changePage = async (pageNumber: number) => {
    const resp = await dispatch(changePageAllWorkers(pageNumber));
    if ("error" in resp && "message" in resp.error && isString(resp.error.message)) {
      setError(resp.error.message);
    }
  };

  return (
    <div className="border-2 rounded-md overflow-auto h-[70vh]">
      {error && <div className="text-red-500 mt-3 mx-3">{error}</div>}
      <Tabs defaultValue="pages" className="h-full flex flex-col">
        <TabsContent className="m-3 h-auto" value="pages">
          <PageMemory onPageChange={changePage} />
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
