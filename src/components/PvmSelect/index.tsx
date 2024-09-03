import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import path from "path-browserify";

const POLKAVM_URL = "https://todr.me/polkavm/pvm-metadata.json";

const fetchWasmMetadata = async (url: string) => {
  try {
    const isValidUrl = Boolean(new URL(url ?? ""));
    if (isValidUrl) {
      return fetch(url).then((res) => res.json());
    } else {
      alert("Invalid URL");
    }
  } catch (error) {
    console.log(error);
    alert("Invalid URL");
  }
};

interface WasmMetadata {
  name: string;
  version: string;
  capabilities: {
    resetJAM: boolean;
    resetGeneric: boolean;
    resetPolkaVM: boolean;
  };
  wasmBlobUrl: string;
}

enum AvailablePvms {
  TYPEBERRY = "typeberry",
  POLKAVM = "polkavm",
  WASM_URL = "wasm-url",
  WASM_FILE = "wasm-file",
}

export const PvmSelect = ({
  onValueChange,
}: {
  onValueChange: (value: { type: string; param: string | Blob }) => void;
}) => {
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [wasmUrlMetadata, setWasmUrlMetadata] = useState<WasmMetadata | null>(null);
  const [polkavmMetadata, setPolkavmMetadata] = useState<WasmMetadata | null>(null);
  const [selectedPvm, setSelectedPvm] = useState<AvailablePvms>(AvailablePvms.TYPEBERRY);

  const handlePvmUpload = (file: Blob) => {
    onValueChange({
      type: "wasm-file",
      param: file,
    });
  };

  useEffect(() => {
    fetchWasmMetadata(POLKAVM_URL).then(setPolkavmMetadata);
  }, []);

  return (
    <>
      <Select
        value={selectedPvm}
        onValueChange={async (value) => {
          setSelectedPvm(value as AvailablePvms);

          if (value === "wasm-file") {
            setIsFileDialogOpen(true);
          }

          if (value === "wasm-file") {
            onValueChange({
              type: "built-in",
              param: "typeberry",
            });
          }
          if (value === "wasm-url") {
            const url = prompt(
              "Enter the URL of the PVM implementation (e.g. https://fluffylabs.dev/pvm-shell/pvm-metadata.json)",
            );
            if (!url) {
              alert("No URL provided");
              return;
            }
            const wasmMetadata = await fetchWasmMetadata(url);
            setWasmUrlMetadata(wasmMetadata);
            console.log("Getting path of the WASM file: ", path.join(url, "../", wasmMetadata.wasmBlobUrl));
            onValueChange({
              type: value,
              param: path.join(url, "../", wasmMetadata.wasmBlobUrl),
            });
          }
          if (value === "typeberry") {
            onValueChange({
              type: "built-in",
              param: "typeberry",
            });
          }
          if (value === "polkavm") {
            onValueChange({
              type: "wasm-url",
              param: path.join(POLKAVM_URL, "../", polkavmMetadata?.wasmBlobUrl as string),
            });
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a PVM" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={AvailablePvms.TYPEBERRY}>
              @typeberry/pvm-{import.meta.env.TYPEBERRY_PVM_VERSION}
            </SelectItem>
            <SelectItem value={AvailablePvms.POLKAVM}>
              {polkavmMetadata?.name} {polkavmMetadata?.version}
            </SelectItem>
            <SelectSeparator />
            <SelectItem value={AvailablePvms.WASM_URL}>
              {wasmUrlMetadata
                ? `${wasmUrlMetadata.name} ${wasmUrlMetadata.version} - click to choose another url`
                : "Load custom PVM from URL as a WASM file"}
            </SelectItem>
            <SelectItem value={AvailablePvms.WASM_FILE}>Upload custom PVM from a file as a WASM</SelectItem>

            <SelectLabel>
              <span>
                Learn to add your PVM implementation here{" "}
                <a href="https://github.com/FluffyLabs/typeberry-toolkit/issues/81" target="_blank">
                  <ExternalLink className="inline w-4 mb-1 text-blue-600" />
                </a>
              </span>
            </SelectLabel>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            <Input
              type="file"
              accept=".wasm"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handlePvmUpload(e.target.files[0]);
                  setIsFileDialogOpen(false);
                }
              }}
            />
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};
