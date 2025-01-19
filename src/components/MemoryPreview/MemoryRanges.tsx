import { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { X, Edit3, Check, HelpCircle, ArrowUp, ArrowDown } from "lucide-react";

// Redux + store
import { loadMemoryRangeAllWorkers, selectMemoryRangesForFirstWorker } from "@/store/workers/workersSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

// This is your existing MemoryRow component from "MemoryInfinite"
import { MemoryRow } from "./MemoryInfinite";
import { MEMORY_SPLIT_STEP } from "@/store/utils";
import { addressFormatter, FindMemoryForWorkerType } from "./utils";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";

const findMemoryForWorkerRange = (rangeAddress: number): FindMemoryForWorkerType => {
  return (worker, address) => {
    const range = worker.memoryRanges.find(({ startAddress }) => startAddress === rangeAddress);

    return range?.data?.find((mem) => mem.address === address);
  };
};

interface RangeRow {
  id: string;
  start: number;
  length: number;
  isEditing: boolean;
}

interface MemoryRangeRowProps extends RangeRow {
  index: number;
  totalCount: number;
  isLast: boolean;
  onChange: (start: number, length: number) => void; // Called when a normal row is saved
  onAddNew: (start: number, length: number, rowId: string) => void; // Called when last row is confirmed
  onEditToggle: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function MemoryRangeRow(props: MemoryRangeRowProps) {
  const {
    id,
    index,
    totalCount,
    start,
    length,
    isEditing,
    isLast,
    onChange,
    onAddNew,
    onEditToggle,
    onRemove,
    onMoveUp,
    onMoveDown,
  } = props;

  const { numeralSystem } = useContext(NumeralSystemContext);
  const dispatch = useAppDispatch();
  const [draftStart, setDraftStart] = useState(start);
  const [draftLength, setDraftLength] = useState(length);

  // Whenever the user changes start/length, fetch memory "live."
  useEffect(() => {
    // Only fetch if the user has at least length > 0, start >= 0, etc.
    if (draftLength > 0 && draftStart >= 0) {
      dispatch(
        loadMemoryRangeAllWorkers({
          rangeId: id,
          startAddress: draftStart,
          length: draftLength,
        }),
      );
    }
  }, [draftStart, draftLength, dispatch, id]);

  // Grab the memory from Redux for this row
  const memoryRanges = useAppSelector(selectMemoryRangesForFirstWorker);

  const matchingRange = memoryRanges.find((r) => r.id === id);
  // Flatten all pages -> bytes
  const rowData = matchingRange?.data?.map((page) => page.bytes) ?? [];

  // "Save" for normal (non-last) rows
  const handleSave = () => {
    // Update parent’s state so the row is no longer editing
    onChange(draftStart, draftLength);
    onEditToggle();
  };

  // Confirm the last row => finalize in parent + add new blank row
  const handleAddConfirm = () => {
    onAddNew(draftStart, draftLength, id);
  };

  // Are we showing input fields (when editing or last row) or just read-only?
  const isInputsVisible = isEditing || isLast;

  const lastAddressLength = addressFormatter(
    matchingRange?.startAddress || 0 + (matchingRange?.length || 0),
    numeralSystem,
  ).length;

  return (
    <Card className="p-3 rounded-none">
      <div className="flex items-center gap-3">
        {/* Read-only vs. input fields */}
        {!isInputsVisible ? (
          <span className="font-mono">
            {start}...+{length}
          </span>
        ) : (
          <>
            <div className="grid gap-1">
              <Label htmlFor={`start-${id}`}>Start</Label>
              <Input
                id={`start-${id}`}
                type="number"
                value={draftStart}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDraftStart(val);
                }}
                className="w-[100px]"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`length-${id}`}>Length</Label>
              <Input
                id={`length-${id}`}
                type="number"
                value={draftLength}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDraftLength(val);
                }}
                max={40 * MEMORY_SPLIT_STEP}
                className="w-[60px]"
              />
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* If it's the last row => single confirm. Otherwise normal row edit/save/remove. */}
          {isLast ? (
            <Button variant="outline" size="icon" onClick={handleAddConfirm}>
              <Check className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button variant="outline" size="icon" onClick={onMoveUp} disabled={index === 0}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={onMoveDown} disabled={index === totalCount - 1}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              {!isEditing ? (
                <>
                  <Button variant="outline" size="icon" onClick={onEditToggle}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={onRemove}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="icon" onClick={handleSave}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={onRemove}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Memory preview (using MemoryRow) */}
      <div className="mt-2 text-sm font-mono">
        <div style={{ maxHeight: "100px", overflowY: "auto" }}>
          {rowData.length === 0 ? (
            <div>(no data)</div>
          ) : (
            rowData.map((chunkBytes, idx) => (
              <div key={idx} className="flex items-start">
                <MemoryRow
                  address={draftStart + idx * MEMORY_SPLIT_STEP}
                  bytes={chunkBytes}
                  selectedAddress={null}
                  addressLength={lastAddressLength}
                  findMemoryForWorker={findMemoryForWorkerRange(matchingRange?.startAddress || 0)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Example popover for advanced interpretations or other metadata */}
      <div className="mt-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="flex gap-1 items-center">
              <HelpCircle className="h-4 w-4" />
              Interpretations
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            {/*
              You could interpret the entire rowData or chunkBytes
              and display them here.
            */}
            <p className="text-sm">Interpret this memory however you like!</p>
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
}

export function MemoryRanges() {
  const [ranges, setRanges] = useState<RangeRow[]>([
    // Example data
    { id: crypto.randomUUID(), start: 131072, length: 32, isEditing: false },
    // The last row is your "Add" row
    { id: crypto.randomUUID(), start: 0, length: 2 * MEMORY_SPLIT_STEP, isEditing: true },
  ]);

  // Finalize the last row, add a new blank row
  function handleAddNewRow(idx: number, start: number, length: number, rowId: string) {
    setRanges((prev) => {
      const copy = [...prev];
      copy[idx] = { id: rowId, start, length, isEditing: false };
      copy.push({
        id: crypto.randomUUID(),
        start: 0,
        length: 2 * MEMORY_SPLIT_STEP,
        isEditing: true,
      });
      return copy;
    });
  }

  // Toggle editing for normal rows
  function handleEditToggle(idx: number) {
    setRanges((prev) => {
      const copy = [...prev];
      copy[idx].isEditing = !copy[idx].isEditing;
      return copy;
    });
  }

  // For normal rows: user finished editing => update `start` & `length`.
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

  function moveRange(fromIndex: number, toIndex: number) {
    setRanges((prev) => {
      const newArr = [...prev];
      const [item] = newArr.splice(fromIndex, 1);
      newArr.splice(toIndex, 0, item);
      return newArr;
    });
  }

  return (
    <div className="max-h-[65vh] overflow-y-auto [&>*:nth-child(odd)]:bg-gray-100">
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
            onMoveUp={() => moveRange(i, i - 1)}
            onMoveDown={() => moveRange(i, i + 1)}
          />
        );
      })}
    </div>
  );
}
