import { useState, useEffect, useContext, useCallback, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { INPUT_STYLES } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { EllipsisVertical } from "lucide-react";
import { loadMemoryRangeAllWorkers, selectMemoryRangesForFirstWorker } from "@/store/workers/workersSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { AddressInput, MemoryCell } from "./MemoryInfinite";
import { MEMORY_SPLIT_STEP } from "@/store/utils";
import { FindMemoryForWorkerType, getMemoryInterpretations } from "./utils";
import { NumeralSystemContext } from "@/context/NumeralSystemContext";
import classNames from "classnames";
import { valueToNumeralSystem } from "../Instructions/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";

const findMemoryForWorkerRange = (rangeAddress: number): FindMemoryForWorkerType => {
  return (worker, address) => {
    const range = worker.memoryRanges.find(({ startAddress }) => startAddress === rangeAddress);

    return range?.data?.find((mem) => mem.address === address);
  };
};

const uint8ToHex = (value: Uint8Array) =>
  "0x" +
  Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, "0")) // Convert to hex and pad with leading zero if necessary
    .join("");

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

type LengthInputProps = {
  value: string;
  id?: string;
  placeholder?: string;
  onChange: (v: number | null) => void;
};
export function LengthInput({ value, onChange, placeholder, id }: LengthInputProps) {
  const [input, setInput] = useState(value);
  const [isValid, setIsValid] = useState(true);
  const maxValue = 400;

  const changeValue = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      const val = ev.currentTarget.value;
      setInput(val);
      const num = Number(val);
      const isEmpty = val === "" || val.match(/^\s+$/) !== null;
      const isValid = !Number.isNaN(num) && !isEmpty && num <= maxValue && num > 0;
      setIsValid(isValid || isEmpty);
      if (isValid) {
        onChange(num);
      }
      if (isEmpty) {
        onChange(null);
      }
    },
    [onChange],
  );

  return (
    <>
      <input
        id={id}
        className={classNames(INPUT_STYLES.replace("focus-visible:ring-ring", ""), "w-full font-inconsolata", {
          "ring-2 ring-red-500": !isValid,
          "focus-visible:ring-ring": isValid,
          "focus-visible:ring-red-500": !isValid,
        })}
        placeholder={placeholder}
        value={input}
        onChange={changeValue}
      />
    </>
  );
}

function MemoryRangeRow({
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
}: MemoryRangeRowProps) {
  const { numeralSystem } = useContext(NumeralSystemContext);
  const dispatch = useAppDispatch();
  const [draftStart, setDraftStart] = useState(start);
  const [draftLength, setDraftLength] = useState(length);

  useEffect(() => {
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

  const memoryRanges = useAppSelector(selectMemoryRangesForFirstWorker);
  const matchingRange = memoryRanges.find((r) => r.id === id);
  const rowData = matchingRange?.data?.map((page) => page.bytes) ?? [];

  const handleSave = () => {
    onChange(draftStart, draftLength);
    onEditToggle();
  };

  const handleAddConfirm = () => {
    onAddNew(draftStart, draftLength, id);
  };

  const isInputsVisible = isEditing || isLast;
  const flatData = rowData.flatMap((chunk) => chunk);
  const interpretResult = getMemoryInterpretations(new Uint8Array(flatData), numeralSystem);

  return (
    <Card className="p-3 border rounded m-3">
      <div className="flex items-end gap-3 ml-3">
        {!isInputsVisible ? (
          <span className="font-inconsolata font-bold text-foreground">
            {valueToNumeralSystem(start, numeralSystem)}...+{valueToNumeralSystem(length, numeralSystem)}
          </span>
        ) : (
          <>
            <div className="grid gap-1">
              <Label htmlFor={`start-${id}`}>Start</Label>

              <AddressInput
                id={`start-${id}`}
                onChange={(v) => v !== null && setDraftStart(v)}
                value={draftStart.toString()}
              />
            </div>
            <div className="grid gap-1 max-w-[65px]">
              <Label htmlFor={`length-${id}`}>Length</Label>
              <LengthInput
                id={`length-${id}`}
                value={draftLength.toString()}
                onChange={(val) => {
                  setDraftLength(val || 0);
                }}
              />
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          {isLast ? (
            <Button onClick={handleAddConfirm}>Add</Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost">
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-secondary p-3 z-50">
                <DropdownMenuItem>
                  <Button variant="ghost" onClick={onMoveUp} disabled={index === 0}>
                    Up
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Button variant="ghost" onClick={onMoveDown} disabled={index === totalCount - 2}>
                    Down
                  </Button>
                </DropdownMenuItem>

                {!isEditing ? (
                  <>
                    <DropdownMenuItem>
                      <Button variant="ghost" onClick={onEditToggle}>
                        Edit
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Button variant="ghost" onClick={onRemove}>
                        Remove
                      </Button>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem>
                      <Button variant="ghost" onClick={handleSave}>
                        Confirm
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Button variant="ghost" onClick={onRemove}>
                        Remove
                      </Button>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="mt-4 mb-2 mx-2 text-sm font-poppins">
        <div style={{ maxHeight: "100px", overflowY: "auto" }}>
          {flatData.length === 0 ? (
            <div>(no data)</div>
          ) : (
            flatData.map((byte, idx) => (
              <Popover>
                <PopoverTrigger>
                  <MemoryCell
                    index={idx}
                    address={draftStart + idx}
                    value={byte}
                    selectedAddress={null}
                    findMemoryForWorker={findMemoryForWorkerRange(matchingRange?.startAddress || 0)}
                    isPageTooltipDisabled
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <a
                    href={`https://papi.fluffylabs.dev/?data=${uint8ToHex(new Uint8Array(flatData))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-brand-dark block mb-2"
                  >
                    Open codec tool
                  </a>

                  {!interpretResult ? (
                    <div>(no data)</div>
                  ) : (
                    <div className="text-sm space-y-1 font-inconsolata">
                      {interpretResult.map((interpretation) => (
                        <div key={interpretation}>{interpretation}</div>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

const createEmptyRow = () => ({ id: crypto.randomUUID(), start: 0, length: 2 * MEMORY_SPLIT_STEP, isEditing: true });

export function MemoryRanges() {
  const [ranges, setRanges] = useState<RangeRow[]>([createEmptyRow()]);

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

  function moveRange(fromIndex: number, toIndex: number) {
    setRanges((prev) => {
      const newArr = [...prev];
      const [item] = newArr.splice(fromIndex, 1);
      newArr.splice(toIndex, 0, item);
      return newArr;
    });
  }

  return (
    <div className="max-h-[65vh] overflow-y-auto">
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
