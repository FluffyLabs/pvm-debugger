import { PageMemory } from "./PageMemory";
export type MemoryPreviewProps = {
  onPageChange: (page: number) => void;
  onRangeChange: (start: number, end: number) => void;
};
export const MemoryPreview = () => {
  return (
    <div className="border-2 rounded-md overflow-auto h-[70vh] p-5">
      <PageMemory />
    </div>
  );
};
