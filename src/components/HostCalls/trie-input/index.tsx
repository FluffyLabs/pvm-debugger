import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { hasPVMGeneratedStorage } from "@/store/debugger/debuggerSlice";
import { useAppSelector } from "@/store/hooks";
import { bytes, hash } from "@typeberry/pvm-debugger-adapter";
import { cloneDeep } from "lodash";
import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";

export interface StorageRow {
  key: string;
  keyHash: string;
  value: string;
  valueBlob: bytes.BytesBlob;
}

type TrieInputProps = {
  initialRows: StorageRow[] | null;
  onChange: (value: StorageRow[]) => void;
};

const is32BytesHex = (h: string) => {
  return h.length === 66 && h.startsWith("0x");
};

const unescapeString = (str: string) => {
  return str.replace(/\\n/g, String.fromCharCode(10)).replace(/\\t/g, String.fromCharCode(9));
};

type StorageItemProps = {
  row: StorageRow;
  index: number;
  lastIndex: number;
  handleRemoveRow: (index: number) => void;
  handleKeyChange: (index: number, value: string) => void;
  handleValueChange: (index: number, value: string) => void;
};

const StorageItem = ({
  row,
  index,
  lastIndex,
  handleRemoveRow,
  handleKeyChange,
  handleValueChange,
}: StorageItemProps) => {
  const isDisabled = useAppSelector(hasPVMGeneratedStorage);

  const value = row.key || row.keyHash;
  return (
    <div className="my-3 p-3 pr-0 flex border rounded-lg">
      <div className="flex flex-col flex-1 gap-3">
        <Input
          placeholder="Key"
          value={value}
          onChange={(e) => handleKeyChange(index, e.target.value)}
          disabled={isDisabled}
          className={cn({
            "focus-visible:ring-red-500 ring-red-500 ring-2": !value,
          })}
        />
        <Input
          placeholder="Key Hash"
          value={row.keyHash}
          onChange={(e) => handleKeyChange(index, e.target.value)}
          disabled={true}
        />
        <Textarea
          autoFocus={index === lastIndex}
          placeholder="Raw value or hex array"
          value={row.value}
          onChange={(e) => handleValueChange(index, e.target.value)}
          className="flex-1 mt-1"
          disabled={isDisabled}
        />
      </div>
      <Button className="mx-2 p-2" variant="ghost" onClick={() => handleRemoveRow(index)} disabled={isDisabled}>
        <XIcon className="w-4 h-4" />
      </Button>
    </div>
  );
};
export const TrieInput = ({ onChange, initialRows }: TrieInputProps) => {
  const isDisabled = useAppSelector(hasPVMGeneratedStorage);

  const [rows, setRows] = useState<StorageRow[]>([
    {
      key: "",
      keyHash: "",
      value: "",
      valueBlob: bytes.BytesBlob.blobFromString(""),
    },
  ]);

  useEffect(() => {
    if (initialRows && initialRows.length > 0) {
      setRows([...initialRows]);
    }
  }, [initialRows]);

  const modifyRows = (newRows: StorageRow[]) => {
    setRows(newRows);
    onChange(newRows);
  };

  const handleKeyChange = (index: number, value: string): void => {
    const newRows = cloneDeep(rows);
    newRows[index].key = value;

    newRows[index].keyHash =
      !value || is32BytesHex(value) ? value : hash.blake2b.hashBytes(bytes.BytesBlob.blobFromString(value)).toString();
    modifyRows(newRows);
  };

  const handleValueChange = (index: number, value: string): void => {
    const newRows = cloneDeep(rows);

    newRows[index].value = value;

    try {
      if (value === "0x") {
        throw new Error("Incomplete value. Treat as string.");
      }

      newRows[index].valueBlob = bytes.BytesBlob.parseBlob(unescapeString(value));
    } catch (error) {
      newRows[index].valueBlob = bytes.BytesBlob.blobFromString(unescapeString(value));
    }
    modifyRows(newRows);
  };

  const handleInsertRow = (): void => {
    const newRows = cloneDeep(rows);

    newRows.push({
      key: "",
      keyHash: "",
      value: "",
      valueBlob: bytes.BytesBlob.blobFromString(""),
    });

    modifyRows(newRows);
    onChange(newRows);
  };

  const handleRemoveRow = (index: number): void => {
    const newRows = cloneDeep(rows);
    newRows.splice(index, 1);
    modifyRows(newRows);
  };

  return (
    <div>
      {rows.map((row, i) => {
        return (
          <StorageItem
            index={i}
            lastIndex={rows.length - 1}
            key={i}
            row={row}
            handleKeyChange={handleKeyChange}
            handleValueChange={handleValueChange}
            handleRemoveRow={handleRemoveRow}
          />
        );
      })}
      <Button className="mt-3 w-full" variant="outlineBrand" onClick={() => handleInsertRow()} disabled={isDisabled}>
        New item
      </Button>
    </div>
  );
};
