import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageMemory } from "./PageMemory";

export type MemoryPreviewProps = {
  onPageChange: (page: number) => void;
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
          <PageMemory onPageChange={props.onPageChange} />
        </TabsContent>
        <TabsContent className="m-2" value="ranges">
          Coming soon
        </TabsContent>
      </Tabs>
    </div>
  );
};
