import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { bytes, hash } from "@typeberry/jam-host-calls";
import { cloneDeep } from "lodash";
import { PlusIcon, XIcon } from "lucide-react";
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
  handleRemoveRow: (index: number) => void;
  handleKeyChange: (index: number, value: string) => void;
  handleValueChange: (index: number, value: string) => void;
};

const StorageItem = ({ row, index, handleRemoveRow, handleKeyChange, handleValueChange }: StorageItemProps) => {
  const backgroundClass = index % 2 === 0 ? "bg-white" : "bg-gray-100";

  // Cover PVM generated hash
  const isKeySameAsHash = (row.key && row.key === row.keyHash) || (!row.key && row.keyHash);

  return (
    <div className={`p-3 flex ${backgroundClass}`}>
      <div className="flex-col w-full">
        <div className="flex items-start">
          <div className="flex flex-col w-full">
            <Input
              placeholder="Key"
              value={row.key || row.keyHash}
              onChange={(e) => handleKeyChange(index, e.target.value)}
            />
            <span className="text-xs py-1 ml-2">
              Key Hash: {isKeySameAsHash ? "--- key is already a hash ---" : row.keyHash}
            </span>
          </div>

          <Button variant="ghost" onClick={() => handleRemoveRow(index)}>
            <XIcon className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center">
          <Textarea
            placeholder="Raw value or hex array"
            value={row.value}
            onChange={(e) => handleValueChange(index, e.target.value)}
            className="flex-1 mt-1"
          />
        </div>
      </div>
    </div>
  );
};
export const TrieInput = ({ onChange, initialRows }: TrieInputProps) => {
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
      !value || is32BytesHex(value) ? value : hash.hashBytes(bytes.BytesBlob.blobFromString(value)).toString();
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
            key={i}
            row={row}
            handleKeyChange={handleKeyChange}
            handleValueChange={handleValueChange}
            handleRemoveRow={handleRemoveRow}
          />
        );
      })}
      <Button className="mt-3 ml-3" variant="secondary" onClick={() => handleInsertRow()}>
        <PlusIcon className="w-4 h-4" /> Add new
      </Button>
    </div>
  );
};
