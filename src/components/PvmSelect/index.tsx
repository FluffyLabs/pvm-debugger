import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCallback, useEffect, useState } from "react";
import path from "path-browserify";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { AvailablePvms } from "@/types/pvm.ts";
import { ExternalLink } from "lucide-react";
import { PvmTypes } from "@/packages/web-worker/types.ts";
import { useDebuggerActions } from "@/hooks/useDebuggerActions";
import classNames from "classnames";
import { ErrorWarningTooltip } from "../ErrorWarningTooltip";
import { isSerializedError } from "@/store/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import {
  selectAllAvailablePvms,
  selectSelectedPvms,
  setPvmOptions,
  setSelectedPvms,
} from "@/store/debugger/debuggerSlice.ts";
import { SerializedFile, serializeFile } from "@/lib/utils.ts";

interface WasmMetadata {
  name: string;
  version: string;
  capabilities: {
    resetJAM: boolean;
    resetGeneric: boolean;
    resetPolkaVM: boolean;
  };
  wasmBlobUrl: string;
  wasmBlobUrl32?: string;
}

export interface SelectedPvmWithPayload {
  id: string;
  type: PvmTypes | AvailablePvms;
  label: string;
  params?: {
    file?: SerializedFile;
    url?: string;
  };
  removable?: boolean;
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

  const selectedPvms = useAppSelector(selectSelectedPvms);
  const pvmsWithPayload = useAppSelector(selectAllAvailablePvms);
  const dispatch = useAppDispatch();

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

  const handlePvmFileUpload = async (file: File) => {
    const id = generatePvmId(file.name);

    const newValues = [
      ...pvmsWithPayload,
      {
        id,
        type: PvmTypes.WASM_FILE,
        params: {
          file: await serializeFile(file),
        },
        label: `${id} - last modified: ${new Date(file.lastModified).toUTCString()}`,
        removable: true,
      },
    ];

    dispatch(setPvmOptions(newValues));
    dispatch(setSelectedPvms([...selectedPvms, id]));
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
          label: `${id} v${wasmMetadata.version}` as string,
          removable: true,
        },
      ];
      dispatch(setPvmOptions(newValues));
      dispatch(setSelectedPvms([...selectedPvms, id]));
    } else {
      alert("No URL provided");
    }
  };

  const handlePvmWsOptions = async () => {
    const id = generatePvmId("ws-pvm");

    const newValues = [
      ...pvmsWithPayload,
      {
        id,
        type: PvmTypes.WASM_WS,
        params: {
          port: 8765,
        },
        label: `${id}`, // v${.version}` as string, TODO: fetch version from ws
        removable: true,
      },
    ];
    dispatch(setPvmOptions(newValues));
    dispatch(setSelectedPvms([...selectedPvms, id]));
  };

  useEffect(() => {
    Promise.all(
      pvmsWithPayload.map(async (pvm) => {
        if (pvm.type === PvmTypes.WASM_URL) {
          if (pvm.params?.url) {
            const metadata = await fetchWasmMetadata(pvm.params.url);
            if (!metadata) {
              throw new Error("Invalid metadata");
            }
            return {
              id: pvm.id,
              type: PvmTypes.WASM_URL,
              params: {
                ...pvmsWithPayload.find((p) => p.id === pvm.id)?.params,
                url: path.join(pvm.params.url, "../", metadata.wasmBlobUrl).replace("https:/", "https://"), // TODO: check why the http protocol path is getting messed up
              },
              label: `${metadata.name} v${metadata.version}` as string,
            };
          }
        }
        return pvm;
      }),
    ).then((values) => {
      dispatch(setPvmOptions(values));
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div
      className={classNames({
        "flex text-gray-500 border rounded-lg border-gray-500": true,
        "border-red-500": !!error,
      })}
    >
      {error && <ErrorWarningTooltip msg={error} />}
      <MultiSelect
        test-id="pvm-select"
        variant="inverted"
        maxCount={1}
        required
        options={pvmsWithPayload.map((pvm) => ({ value: pvm.id, label: pvm.label, removable: pvm.removable }))}
        selectedValues={selectedPvms}
        defaultValue={[AvailablePvms.TYPEBERRY]}
        onValueChange={async (values) => {
          dispatch(setSelectedPvms(values));
        }}
        removeOption={(value) => {
          dispatch(setPvmOptions(pvmsWithPayload.filter((pvm) => pvm.id !== value)));
        }}
      >
        <span className="cursor-pointer" onClick={handlePvmUrlOption}>
          Load custom PVM from URL as a WASM file
        </span>
        <span className="cursor-pointer" onClick={handlePvmFileOption}>
          Upload custom PVM from a file as a WASM
        </span>
        <span className="cursor-pointer" onClick={handlePvmWsOptions}>
          Connect to a WebSocket PVM at ws://localhost:8765
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
