// Import necessary components and hooks
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusIcon, GripVerticalIcon, EyeIcon, MoreVerticalIcon, CheckIcon } from "lucide-react";

// Import dnd-kit components
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Textarea } from "@/components/ui/textarea";

// Import shadcn/ui Dropdown Menu components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { bytes, hash } from "@typeberry/jam-host-calls";
import classNames from "classnames";

const truncateString = (str: string, maxLength: number = 20) =>
  str.length >= maxLength ? str.substring(0, 4) + "..." + str.substring(str.length - 4) : str;

const is32BytesHex = (h: string) => {
  return h.length === 66 && h.startsWith("0x");
};

const unescapeString = (str: string) => {
  return str.replace(/\\n/g, String.fromCharCode(10)).replace(/\\t/g, String.fromCharCode(9));
};

const escapeString = (str: string) => {
  return str.replace(/\n/g, "\\n").replace(/\t/g, "\\t");
};

// Define the type for a row
export interface StorageRow {
  id: string;
  action: "insert" | "remove" | "";
  key: string;
  keyHash: string;
  value: bytes.BytesBlob;
  isSubmitted: boolean;
  isHidden: boolean; // Property to track temporary removal
  isEditing: boolean; // Property to track edit mode
}

type TrieInputProps = {
  initialRows: StorageRow[] | null;
  onChange: (value: StorageRow[]) => void;
};

export const TrieInput = ({ onChange, initialRows }: TrieInputProps) => {
  // Initialize state with submitted rows and a single unsubmitted row
  const [rows, setRows] = useState<StorageRow[]>([
    {
      id: "1",
      action: "",
      key: "",
      keyHash: "",
      value: bytes.BytesBlob.blobFromString(""),
      isSubmitted: false,
      isHidden: false,
      isEditing: false,
    },
  ]);

  useEffect(() => {
    if (initialRows && initialRows.length > 0) {
      const lastId = parseInt(initialRows[initialRows.length - 1].id);
      setRows([
        ...initialRows.map((row) => ({
          ...row,
          isHidden: false,
          isEditing: false,
        })), // Ensure properties are set
        {
          id: (lastId + 1).toString(),
          action: "",
          key: "",
          keyHash: "",
          value: bytes.BytesBlob.blobFromString(""),
          isSubmitted: false,
          isHidden: false,
          isEditing: false,
        },
      ]);
    }
  }, [initialRows]);

  const modifyRows = (newRows: StorageRow[]) => {
    setRows(newRows);
    // Emit rows excluding the hidden ones
    onChange(newRows.filter((row) => row.isSubmitted && !row.isHidden));
  };

  // Handle changes in the Select component
  const handleSelectChange = (index: number, value: string): void => {
    const newRows = [...rows];
    newRows[index].action = value as "insert" | "remove" | "";
    modifyRows(newRows);
  };

  // Handle changes in the Key input
  const handleKeyChange = (index: number, value: string): void => {
    const newRows = [...rows];
    newRows[index].key = value;

    newRows[index].keyHash = is32BytesHex(value)
      ? value
      : hash.hashBytes(bytes.BytesBlob.blobFromString(value)).toString();
    modifyRows(newRows);
  };

  // Handle changes in the Value input
  const handleValueChange = (index: number, rawValue: string): void => {
    // Allow user to finish hex value before validation
    const newRows = [...rows];

    const value = unescapeString(rawValue);

    try {
      if (value === "0x") {
        throw new Error("Incomplete value. Treat as string.");
      }
      newRows[index].value = bytes.BytesBlob.parseBlob(value);
    } catch (error) {
      newRows[index].value = bytes.BytesBlob.blobFromString(value);
    }
    modifyRows(newRows);
  };

  // Handle adding a new row (only when the plus icon is clicked)
  const handleInsertRow = (index: number): void => {
    const newRows = [...rows];
    newRows[index].isSubmitted = true;

    // Create a new unsubmitted row
    newRows.push({
      id: (parseInt(newRows[newRows.length - 1].id) + 1).toString(),
      action: "",
      key: "",
      keyHash: "",
      value: bytes.BytesBlob.blobFromString(""),
      isSubmitted: false,
      isHidden: false,
      isEditing: false,
    });

    modifyRows(newRows);
  };

  // Handle removing a row
  const handleRemoveRow = (index: number): void => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    modifyRows(newRows);
  };

  // Handle toggling edit mode
  const handleToggleEditMode = (index: number): void => {
    const newRows = [...rows];
    newRows[index].isEditing = !newRows[index].isEditing;
    modifyRows(newRows);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const submittedRows = rows.filter((row) => row.isSubmitted);
      const oldIndex = submittedRows.findIndex((row) => row.id === active.id);
      const newIndex = submittedRows.findIndex((row) => row.id === over.id);
      const newSubmittedRows = arrayMove(submittedRows, oldIndex, newIndex);

      // Keep the unsubmitted row at the end
      const unsubmittedRow = rows.find((row) => !row.isSubmitted);
      modifyRows([...newSubmittedRows, unsubmittedRow!]);
    }
  };

  // Handle eye icon click (temporary removal)
  const handleEyeIconClick = (index: number): void => {
    const newRows = [...rows];
    newRows[index].isHidden = !newRows[index].isHidden; // Toggle the isHidden state
    modifyRows(newRows);
  };

  // Separate submitted and unsubmitted rows
  const submittedRows = rows.filter((row) => row.isSubmitted);
  const unsubmittedRow = rows.find((row) => !row.isSubmitted);

  let rowIndex = 0; // Initialize row index

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={submittedRows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
        {submittedRows.map((row) => {
          // Get the index in the original rows array
          const index = rows.findIndex((r) => r.id === row.id);
          const currentRowIndex = rowIndex++;
          return (
            <SortableItem
              key={row.id}
              id={row.id}
              index={index}
              row={row}
              handleSelectChange={handleSelectChange}
              handleKeyChange={handleKeyChange}
              handleValueChange={handleValueChange}
              handleInsertRow={handleInsertRow}
              handleRemoveRow={handleRemoveRow}
              handleToggleEditMode={handleToggleEditMode}
              handleEyeIconClick={handleEyeIconClick}
              rowNumber={currentRowIndex} // Pass the overall row number
            />
          );
        })}
      </SortableContext>

      {/* Render the single unsubmitted InputRow */}
      {unsubmittedRow && (
        <InputRow
          index={rows.findIndex((r) => r.id === unsubmittedRow.id)}
          row={unsubmittedRow}
          handleSelectChange={handleSelectChange}
          handleKeyChange={handleKeyChange}
          handleValueChange={handleValueChange}
          handleInsertRow={handleInsertRow}
          rowNumber={rowIndex} // Pass the overall row number
        />
      )}
    </DndContext>
  );
};

// SortableItem Component
interface SortableItemProps {
  id: string;
  index: number;
  row: StorageRow;
  handleSelectChange: (index: number, value: string) => void;
  handleKeyChange: (index: number, value: string) => void;
  handleValueChange: (index: number, value: string) => void;
  handleInsertRow: (index: number) => void;
  handleRemoveRow: (index: number) => void;
  handleToggleEditMode: (index: number) => void;
  handleEyeIconClick: (index: number) => void;
  rowNumber: number; // New prop for alternating background
}

function SortableItem(props: SortableItemProps): JSX.Element {
  const {
    id,
    index,
    row,
    handleSelectChange,
    handleKeyChange,
    handleValueChange,
    handleRemoveRow,
    handleToggleEditMode,
    handleEyeIconClick,
    rowNumber,
  } = props;

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  const backgroundClass = rowNumber % 2 === 0 ? "bg-white" : "bg-gray-100";

  return (
    <div ref={setNodeRef} style={style} className={`flex p-2 ${row.isHidden ? "opacity-50" : ""} ${backgroundClass}`}>
      <div>
        {/* Drag Handle */}
        <Button variant="ghost" className="mr-1 px-1" {...attributes} {...listeners}>
          <GripVerticalIcon className="w-4 h-4 cursor-move" />
        </Button>
      </div>
      <div className="flex-col w-full">
        <div className={classNames(["flex", row.isEditing ? "items-start" : "items-center"])}>
          {row.isEditing ? (
            <>
              <div className="w-[150px]">
                <Select onValueChange={(value) => handleSelectChange(index, value)} value={row.action}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insert">Insert</SelectItem>
                    <SelectItem value="remove">Remove</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col w-full">
                <Input placeholder="Key" value={row.key} onChange={(e) => handleKeyChange(index, e.target.value)} />
                <span className="text-xs py-1 ml-2">
                  Key Hash: {row.key === row.keyHash ? "--- key is already a hash ---" : row.keyHash}
                </span>
              </div>
              {/* Checkmark Icon */}
              <Button variant="ghost" onClick={() => handleToggleEditMode(index)}>
                <CheckIcon className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="w-[150px]">
                <span className="w-24 capitalize">{row.action}</span>
              </div>
              <span className="w-full">{truncateString(row.key)}</span>
              {/* More Icon with Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">
                    <MoreVerticalIcon className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => handleToggleEditMode(index)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleRemoveRow(index)}>Remove</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
        {row.isEditing ? (
          <div className="flex items-center">
            <Textarea
              placeholder="Value"
              disabled={row.action === "remove"}
              value={escapeString(row.value.asText())}
              onChange={(e) => handleValueChange(index, e.target.value)}
              className="flex-1 mt-1"
            />
            {/* Eye Icon */}
            <Button variant="ghost" onClick={() => handleEyeIconClick(index)}>
              <EyeIcon className={`w-4 h-4 ${row.isHidden ? "text-gray-500" : ""}`} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <p className="flex-1">{truncateString(escapeString(row.value.asText()))}</p>
            {/* Eye Icon */}
            <Button variant="ghost" onClick={() => handleEyeIconClick(index)}>
              <EyeIcon className={`w-4 h-4 ${row.isHidden ? "text-gray-500" : ""}`} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// InputRow Component
interface InputRowProps {
  index: number;
  row: StorageRow;
  handleSelectChange: (index: number, value: string) => void;
  handleKeyChange: (index: number, value: string) => void;
  handleValueChange: (index: number, value: string) => void;
  handleInsertRow: (index: number) => void;
  rowNumber: number; // New prop for alternating background
}

const InputRow = (props: InputRowProps) => {
  const { index, row, handleSelectChange, handleKeyChange, handleValueChange, handleInsertRow, rowNumber } = props;

  const backgroundClass = rowNumber % 2 === 0 ? "bg-white" : "bg-gray-100";

  return (
    <div className={`flex p-2 ${backgroundClass}`}>
      <div className="flex-col w-full items-start">
        <div className="flex items-start">
          <div className="w-[150px]">
            <Select onValueChange={(value) => handleSelectChange(index, value)} value={row.action}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="insert">Insert</SelectItem>
                <SelectItem value="remove">Remove</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col w-full">
            <Input placeholder="Key" value={row.key} onChange={(e) => handleKeyChange(index, e.target.value)} />
            <span className="text-xs py-1 ml-2">
              Key Hash: {row.key === row.keyHash ? "--- key is already a hash ---" : row.keyHash}
            </span>
          </div>

          {/* Add Button */}
          <Button
            variant="ghost"
            onClick={() => handleInsertRow(index)}
            disabled={!row.action || !row.key || (row.action === "insert" && !row.value)}
          >
            <PlusIcon className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center">
          <Textarea
            placeholder="Raw value or hex array"
            disabled={row.action === "remove"}
            value={escapeString(row.value.asText())}
            onChange={(e) => handleValueChange(index, e.target.value)}
            className="flex-1 mt-1"
          />
        </div>
      </div>
    </div>
  );
};
