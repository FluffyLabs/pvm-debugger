import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCallback, useEffect, useState } from "react";
import path from "path-browserify";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { AvailablePvms } from "@/types/pvm.ts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SupportedLangs } from "@/packages/web-worker/utils";
import { ExternalLink } from "lucide-react";
import { PvmTypes } from "@/packages/web-worker/types.ts";
import { useDebuggerActions } from "@/hooks/useDebuggerActions";
import classNames from "classnames";
import { ErrorWarningTooltip } from "../ErrorWarningTooltip";
import { isSerializedError } from "@/store/utils";

const PVMS_TO_LOAD_ON_START = [
  {
    value: AvailablePvms.POLKAVM,
    url: "https://todr.me/polkavm/pvm-metadata.json",
    lang: SupportedLangs.Rust,
  },
  {
    value: AvailablePvms.ANANAS,
    url: "https://todr.me/anan-as/pvm-metadata.json",
    lang: SupportedLangs.AssemblyScript,
  },
];

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

export const PvmSelect = () => {
  const { handlePvmTypeChange } = useDebuggerActions();
  const [error, setError] = useState<string>();
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

  const mapValuesToPvmWithPayload = useCallback(
    (values: string[]) => {
      return values
        .map((value) => {
          return pvmsWithPayload.find((pvm) => pvm.id === value);
        })
        .filter((value) => value !== undefined);
    },
    [pvmsWithPayload],
  );

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
    PVMS_TO_LOAD_ON_START.forEach(({ url, value, lang }) => {
      fetchWasmMetadata(url).then((metadata) => {
        if (!metadata) {
          throw new Error("Invalid metadata");
        }
        setMultiSelectOptions((prevState) => [
          ...prevState,
          { value, label: `${metadata.name} v${metadata.version}` as string },
        ]);
        setPvmsWithPayload((prevState) => [
          ...prevState,
          {
            id: value,
            type: PvmTypes.WASM_URL,
            params: {
              url: path.join(url, "../", metadata.wasmBlobUrl),
              lang,
            },
          },
        ]);
      });
    });
  }, []);

  useEffect(() => {
    const asyncChange = async () => {
      try {
        setError("");
        await handlePvmTypeChange(mapValuesToPvmWithPayload(selectedPvms));
      } catch (error) {
        if (error instanceof Error || isSerializedError(error)) {
          setError(error.message);
        }
      }
    };
    asyncChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPvms]);

  return (
    <div className="flex">
      {error && <ErrorWarningTooltip classNames="mr-3" msg={error} />}
      <MultiSelect
        test-id="pvm-select"
        maxCount={1}
        required
        className={classNames({ "border-red-500": !!error })}
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
                <Select onValueChange={(value: SupportedLangs) => setSelectedLang(value)} value={selectedLang}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SupportedLangs.Go}>Go</SelectItem>
                    <SelectItem value={SupportedLangs.Rust}>Rust</SelectItem>
                    <SelectItem value={SupportedLangs.AssemblyScript}>AssemblyScript</SelectItem>
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
    </div>
  );
};
