import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";
import { MemoryRangeRow } from "./MemoryRangesRow";
import { createEmptyRow, RangeRow } from "./MemoryRangesEmptyRow";

type MemoryRangesProps = {
  ranges: RangeRow[];
  setRanges: (x: React.SetStateAction<RangeRow[]>) => void;
};

export function MemoryRanges({ ranges, setRanges }: MemoryRangesProps) {
  function handleAddNewRow(idx: number, start: number, length: number, rowId: string) {
    setRanges((prev) => {
      const copy = [...prev];
      copy[idx] = { id: rowId, start, length, isEditing: false };
      copy.push(createEmptyRow());
      return copy;
    });
  }

  function handleEditToggle(idx: number) {
    setRanges((prev) => {
      const copy = [...prev];
      copy[idx].isEditing = !copy[idx].isEditing;
      return copy;
    });
  }

  function handleChange(idx: number, start: number, length: number) {
    setRanges((prev) => {
      const copy = [...prev];
      copy[idx].start = start;
      copy[idx].length = length;
      return copy;
    });
  }

  function handleRemove(idx: number) {
    setRanges((prev) => {
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy;
    });
  }
  function handleMove(dragIndex: number, hoverIndex: number) {
    setRanges((prev) => {
      const newArr = [...prev];
      const [movedRow] = newArr.splice(dragIndex, 1);
      newArr.splice(hoverIndex, 0, movedRow);
      return newArr;
    });
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen max-h-full">
        {ranges.map((r, i) => {
          const isLast = i === ranges.length - 1;
          return (
            <MemoryRangeRow
              key={r.id}
              {...r}
              index={i}
              totalCount={ranges.length}
              isLast={isLast}
              onChange={(start, length) => handleChange(i, start, length)}
              onAddNew={(start, length, rowId) => handleAddNewRow(i, start, length, rowId)}
              onEditToggle={() => handleEditToggle(i)}
              onRemove={() => handleRemove(i)}
              onMove={handleMove}
            />
          );
        })}
      </div>
    </DndProvider>
  );
}
