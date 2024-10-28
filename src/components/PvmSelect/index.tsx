import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import path from "path-browserify";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { AvailablePvms } from "@/types/pvm.ts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SupportedLangs } from "@/packages/web-worker/utils";
import { ExternalLink } from "lucide-react";
import { PvmTypes } from "@/packages/web-worker/worker.ts";

const POLKAVM_URL = "https://todr.me/polkavm/pvm-metadata.json";

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

export interface SelectedPvmWithPayload {
  id: string;
  type: string;
  params?: {
    file?: Blob;
    lang?: SupportedLangs;
    url?: string;
  };
}

const fetchWasmMetadata = async (url: string): Promise<WasmMetadata | undefined> => {
  try {
    const isValidUrl = Boolean(new URL(url ?? ""));
    if (isValidUrl) {
      const response = await fetch(url);
      if (!response.ok) {
        alert("Failed to fetch metadata for given URL");
      }
      return response.json();
    } else {
      alert("Invalid URL");
    }
  } catch (error) {
    console.error(error);
    alert("Invalid URL");
  }
  return;
};

export const PvmSelect = ({ onValueChange }: { onValueChange: (value: SelectedPvmWithPayload[]) => void }) => {
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [selectedPvms, setSelectedPvms] = useState<string[]>([AvailablePvms.TYPEBERRY]);
  const [pvmsWithPayload, setPvmsWithPayload] = useState<SelectedPvmWithPayload[]>([
    {
      id: "typeberry",
      type: "built-in",
    },
  ]);
  const [multiSelectOptions, setMultiSelectOptions] = useState<{ value: string; label: string }[]>([
    { value: AvailablePvms.TYPEBERRY, label: `@typeberry/pvm v${import.meta.env.TYPEBERRY_PVM_VERSION}` },
  ]);
  const [selectedLang, setSelectedLang] = useState<SupportedLangs>(SupportedLangs.Rust);

  const mapValuesToPvmWithPayload = (values: string[]) => {
    return values
      .map((value) => {
        return pvmsWithPayload.find((pvm) => pvm.id === value);
      })
      .filter((value) => value !== undefined);
  };

  const generatePvmId = (name: string) => {
    return pvmsWithPayload.find((pvm) => pvm.id === name)
      ? `${name}-${pvmsWithPayload.filter((pvm) => pvm.id.startsWith(name)).length}`
      : name;
  };

  const handlePvmFileUpload = (file: File) => {
    const id = generatePvmId(file.name);

    const newValues = [
      ...pvmsWithPayload,
      {
        id,
        type: PvmTypes.WASM_FILE,
        params: {
          lang: selectedLang,
          file,
        },
      },
    ];
    setPvmsWithPayload(newValues);
    setMultiSelectOptions((prevState) => [...prevState, { value: id, label: id }]);
    setSelectedPvms([...selectedPvms, id]);
  };

  const handlePvmFileOption = () => {
    setIsFileDialogOpen(true);
  };

  const handlePvmUrlOption = async () => {
    const url = prompt(
      "Enter the URL of the PVM implementation (e.g. https://fluffylabs.dev/pvm-shell/pvm-metadata.json)",
    );

    if (url) {
      const wasmMetadata = await fetchWasmMetadata(url);

      if (!wasmMetadata) {
        throw new Error("Invalid metadata");
      }

      const id = generatePvmId(wasmMetadata.name);

      const newValues = [
        ...pvmsWithPayload,
        {
          id,
          type: PvmTypes.WASM_URL,
          params: {
            url: path.join(url, "../", wasmMetadata.wasmBlobUrl),
          },
        },
      ];
      setPvmsWithPayload(newValues);
      setMultiSelectOptions((prevState) => [...prevState, { value: id, label: `${id} v${wasmMetadata.version}` }]);
      setSelectedPvms([...selectedPvms, id]);
    } else {
      alert("No URL provided");
    }
  };

  useEffect(() => {
    fetchWasmMetadata(POLKAVM_URL).then((metadata) => {
      if (!metadata) {
        throw new Error("Invalid metadata");
      }
      setMultiSelectOptions((prevState) => [
        ...prevState,
        { value: AvailablePvms.POLKAVM, label: `${metadata.name} v${metadata.version}` as string },
      ]);
      setPvmsWithPayload((prevState) => [
        ...prevState,
        {
          id: AvailablePvms.POLKAVM,
          type: PvmTypes.WASM_URL,
          params: {
            url: path.join(POLKAVM_URL, "../", metadata.wasmBlobUrl),
          },
        },
      ]);
    });
  }, []);

  useEffect(() => {
    onValueChange(mapValuesToPvmWithPayload(selectedPvms));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [selectedPvms]);

  return (
    <>
      <MultiSelect
        test-id="pvm-select"
        maxCount={1}
        required
        options={multiSelectOptions}
        selectedValues={selectedPvms}
        defaultValue={[AvailablePvms.TYPEBERRY]}
        onValueChange={async (values) => {
          setSelectedPvms(values);
        }}
      >
        <span className="cursor-pointer" onClick={handlePvmUrlOption}>
          Load custom PVM from URL as a WASM file
        </span>
        <span className="cursor-pointer" onClick={handlePvmFileOption}>
          Upload custom PVM from a file as a WASM
        </span>
        <span>
          Learn to add your PVM implementation here{" "}
          <a href="https://github.com/FluffyLabs/pvm-debugger/issues/81" target="_blank">
            <ExternalLink className="inline w-4 mb-1 text-blue-600" />
          </a>
        </span>
      </MultiSelect>
      <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
        <DialogContent>
          <DialogTitle>Upload WASM file</DialogTitle>
          <DialogDescription>
            <div className="flex justify-between">
              <div>
                <Select onValueChange={(value: SupportedLangs) => setSelectedLang(value)} value={SupportedLangs.Rust}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SupportedLangs.Go}>Go</SelectItem>
                    <SelectItem value={SupportedLangs.Rust}>Rust</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  type="file"
                  accept=".wasm"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handlePvmFileUpload(e.target.files[0]);
                      setIsFileDialogOpen(false);
                    }
                  }}
                />
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};
