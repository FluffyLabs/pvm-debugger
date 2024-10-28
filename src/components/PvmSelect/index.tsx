import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import path from "path-browserify";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { AvailablePvms } from "@/types/pvm.ts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SupportedLangs } from "@/packages/web-worker/utils";

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
    console.error(error);
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

export interface SelectedPvmWithPayload {
  value: string;
  type: string;
  param:
    | string
    | {
        file?: Blob;
        lang?: SupportedLangs;
        url?: string;
      };
}

export const PvmSelect = ({ onValueChange }: { onValueChange: (value: SelectedPvmWithPayload[]) => void }) => {
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [wasmUrlMetadata, setWasmUrlMetadata] = useState<WasmMetadata | null>(null);
  const [polkavmMetadata, setPolkavmMetadata] = useState<WasmMetadata | null>(null);
  const [selectedPvms, setSelectedPvms] = useState<AvailablePvms[]>([AvailablePvms.TYPEBERRY]);
  const [selectedPvmsWithPayload, setSelectedPvmsWithPayload] = useState<SelectedPvmWithPayload[]>([
    {
      value: "typeberry",
      type: "built-in",
      param: "typeberry",
    },
  ]);
  const [selectedLang, setSelectedLang] = useState<SupportedLangs>(SupportedLangs.Rust);

  const handlePvmUpload = (file: Blob) => {
    const newValues = [
      ...selectedPvmsWithPayload.filter((value) => value.type !== "wasm-file"),
      {
        value: "wasm-file",
        type: "wasm-file",
        param: {
          lang: selectedLang,
          file,
        },
      },
    ];
    setSelectedPvmsWithPayload(newValues);
    onValueChange(newValues);
  };

  useEffect(() => {
    fetchWasmMetadata(POLKAVM_URL).then(setPolkavmMetadata);
  }, []);

  return (
    <>
      <MultiSelect
        test-id="pvm-select"
        maxCount={1}
        options={[
          { value: AvailablePvms.TYPEBERRY, label: "@typeberry/pvm" },
          { value: AvailablePvms.POLKAVM, label: polkavmMetadata?.name as string },
          {
            value: AvailablePvms.WASM_URL,
            label: wasmUrlMetadata
              ? `${wasmUrlMetadata.name} ${wasmUrlMetadata.version} - click to choose another url`
              : "Load custom PVM from URL as a WASM file",
          },
          { value: AvailablePvms.WASM_FILE, label: "Upload custom PVM from a file as a WASM" },
        ]}
        value={selectedPvms as unknown as string[]}
        defaultValue={[AvailablePvms.TYPEBERRY]}
        onValueChange={async (values) => {
          setSelectedPvms(values as unknown as AvailablePvms[]);
          const newValues = await Promise.all(
            values.map(async (value) => {
              if (value === "wasm-file") {
                setIsFileDialogOpen(true);
                return { value, type: "wasm-file", param: "" };
              }
              if (value === "wasm-url") {
                const url = prompt(
                  "Enter the URL of the PVM implementation (e.g. https://fluffylabs.dev/pvm-shell/pvm-metadata.json)",
                );
                if (!url) {
                  alert("No URL provided");
                  return { value, type: "wasm-url", param: "" };
                }
                const wasmMetadata = await fetchWasmMetadata(url);
                setWasmUrlMetadata(wasmMetadata);
                return {
                  value,
                  type: value,
                  param: path.join(url, "../", wasmMetadata.wasmBlobUrl),
                };
              }
              if (value === "typeberry") {
                return { value, type: "built-in", param: "typeberry" };
              }
              if (value === "polkavm") {
                return {
                  value,
                  type: "wasm-url",
                  param: path.join(POLKAVM_URL, "../", polkavmMetadata?.wasmBlobUrl as string),
                };
              }
              return { type: value, param: "", value };
            }),
          );
          setSelectedPvmsWithPayload(newValues);
          onValueChange(newValues);
        }}
      />
      {/*<Select*/}
      {/*  multiple*/}
      {/*  value={selectedPvms as unknown as string[]}*/}
      {/*  onValueChange={async (values) => {*/}
      {/*    setSelectedPvms(values as unknown as AvailablePvms[]);*/}

      {/*    const newValues = await Promise.all(*/}
      {/*      values.map(async (value) => {*/}
      {/*        if (value === "wasm-file") {*/}
      {/*          setIsFileDialogOpen(true);*/}
      {/*          return { type: "wasm-file", param: "" };*/}
      {/*        }*/}
      {/*        if (value === "wasm-url") {*/}
      {/*          const url = prompt(*/}
      {/*            "Enter the URL of the PVM implementation (e.g. https://fluffylabs.dev/pvm-shell/pvm-metadata.json)",*/}
      {/*          );*/}
      {/*          if (!url) {*/}
      {/*            alert("No URL provided");*/}
      {/*            return { type: "wasm-url", param: "" };*/}
      {/*          }*/}
      {/*          const wasmMetadata = await fetchWasmMetadata(url);*/}
      {/*          setWasmUrlMetadata(wasmMetadata);*/}
      {/*          return {*/}
      {/*            type: value,*/}
      {/*            param: path.join(url, "../", wasmMetadata.wasmBlobUrl),*/}
      {/*          };*/}
      {/*        }*/}
      {/*        if (value === "typeberry") {*/}
      {/*          return { type: "built-in", param: "typeberry" };*/}
      {/*        }*/}
      {/*        if (value === "polkavm") {*/}
      {/*          return {*/}
      {/*            type: "wasm-url",*/}
      {/*            param: path.join(POLKAVM_URL, "../", polkavmMetadata?.wasmBlobUrl as string),*/}
      {/*          };*/}
      {/*        }*/}
      {/*        return { type: value, param: "" };*/}
      {/*      })*/}
      {/*    };*/}

      {/*    onValueChange(newValues);*/}
      {/*  }}*/}
      {/*>*/}
      {/*  <SelectTrigger test-id="pvm-select">*/}
      {/*    <SelectValue placeholder="Select PVMs" />*/}
      {/*  </SelectTrigger>*/}
      {/*  <SelectContent>*/}
      {/*    <SelectGroup>*/}
      {/*      <SelectItem value={AvailablePvms.TYPEBERRY}>*/}
      {/*        @typeberry/pvm-{import.meta.env.TYPEBERRY_PVM_VERSION}*/}
      {/*      </SelectItem>*/}
      {/*      <SelectItem value={AvailablePvms.POLKAVM}>*/}
      {/*        {polkavmMetadata?.name} {polkavmMetadata?.version}*/}
      {/*      </SelectItem>*/}
      {/*      <SelectSeparator />*/}
      {/*      <SelectItem value={AvailablePvms.WASM_URL}>*/}
      {/*        {wasmUrlMetadata*/}
      {/*          ? `${wasmUrlMetadata.name} ${wasmUrlMetadata.version} - click to choose another url`*/}
      {/*          : "Load custom PVM from URL as a WASM file"}*/}
      {/*      </SelectItem>*/}
      {/*      <SelectItem value={AvailablePvms.WASM_FILE}>Upload custom PVM from a file as a WASM</SelectItem>*/}

      {/*      <SelectLabel>*/}
      {/*        <span>*/}
      {/*          Learn to add your PVM implementation here{" "}*/}
      {/*          <a href="https://github.com/FluffyLabs/pvm-debugger/issues/81" target="_blank">*/}
      {/*            <ExternalLink className="inline w-4 mb-1 text-blue-600" />*/}
      {/*          </a>*/}
      {/*        </span>*/}
      {/*      </SelectLabel>*/}
      {/*    </SelectGroup>*/}
      {/*  </SelectContent>*/}
      {/*</Select>*/}
      <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
        <DialogContent>
          <DialogTitle>Upload WASM file</DialogTitle>
          <DialogDescription>
            <div className="flex justify-between">
              <div>
                <Select onValueChange={(value: SupportedLangs) => setSelectedLang(value)}>
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
                      handlePvmUpload(e.target.files[0]);
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
