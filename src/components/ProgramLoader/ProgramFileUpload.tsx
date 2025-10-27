import { useDropzone } from "react-dropzone";
import { ProgramUploadFileOutput } from "./types";
import { bytes } from "@typeberry/lib";
import { useAppSelector } from "@/store/hooks";
import { selectInitialState } from "@/store/debugger/debuggerSlice";
import { cn } from "@/lib/utils.ts";
import { UploadCloud } from "lucide-react";
import { Button } from "../ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "../ui/input";
import { loadFileFromUint8Array } from "./loadingUtils";

type ProgramFileUploadProps = {
  onFileUpload: (val: ProgramUploadFileOutput) => void;
  setError: (e?: string) => void;
  isError: boolean;
  close?: () => void;
};

export const ProgramFileUpload: React.FC<ProgramFileUploadProps> = ({ isError, onFileUpload, close, setError }) => {
  const initialState = useAppSelector(selectInitialState);
  const spiArgs = useAppSelector((state) => state.debugger.spiArgs);

  const [isUpload, setIsUpload] = useState(true);
  const [manualInput, setManualInput] = useState("");
  const [loadedFileName, setLoadedFileName] = useState<string | undefined>(undefined);

  const spiArgsAsBytes = useMemo(() => {
    try {
      return bytes.BytesBlob.parseBlob(spiArgs ?? "0x").raw;
    } catch {
      return new Uint8Array();
    }
  }, [spiArgs]);

  useEffect(() => {
    // reset the state of upload
    if (isUpload) {
      return;
    }

    if (manualInput === "") {
      setError(undefined);
      return;
    }

    const buffer = new TextEncoder().encode(manualInput);
    loadFileFromUint8Array("pasted", buffer, spiArgsAsBytes, setError, onFileUpload, initialState);
  }, [manualInput, isUpload, initialState, onFileUpload, spiArgsAsBytes, setError]);

  const handleFileRead = (e: ProgressEvent<FileReader>) => {
    setError(undefined);
    const arrayBuffer = e.target?.result;

    if (!(arrayBuffer instanceof ArrayBuffer)) {
      setError("Failed to read the file");
      return;
    }

    loadFileFromUint8Array(
      loadedFileName ?? "",
      new Uint8Array(arrayBuffer),
      spiArgsAsBytes,
      setError,
      onFileUpload,
      initialState,
    );
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length) {
      const file = acceptedFiles[0];
      setLoadedFileName(file.name);
      const fileReader = new FileReader();
      fileReader.onloadend = handleFileRead;
      fileReader.readAsArrayBuffer(file);
      close?.();
    }
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "application/octet-stream": [".bin", ".pvm"], "application/json": [".json"] },
    noClick: true,
  });

  const handleOpen = useCallback(() => {
    setIsUpload(true);
    open();
  }, [open]);

  const setNoUpload = useCallback(() => {
    setIsUpload(false);
    setLoadedFileName(undefined);
    setError(undefined);
  }, [setError]);

  const isLoaded = loadedFileName !== undefined;

  return (
    <div>
      <div
        {...getRootProps()}
        className="flex items-center justify-between border-dashed border-2 py-3 px-4 rounded-lg w-full mx-auto space-x-6"
      >
        <div className="flex items-center space-x-2 flex-1">
          {isUpload ? (
            <>
              <UploadCloud className="text-title-secondary-foreground" width="30px" height="30px" />
              <p className="text-[10px] text-title-secondary-foreground">
                {isLoaded ? loadedFileName : "Select a file or drag and drop"}
              </p>
            </>
          ) : (
            <Input
              placeholder="Hex-prefixed code"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className={cn("flex-auto text-xs", {
                "focus-visible:ring-red-500 ring-red-500 ring-2": isError,
              })}
            />
          )}
        </div>
        <div className="flex space-x-2">
          {isUpload && (
            <Button className="text-[10px] py-1 h-9" variant="ghost" onClick={setNoUpload}>
              Paste manually
            </Button>
          )}
          <Button className="text-[10px] py-1 h-9" variant="outlineBrand" onClick={handleOpen}>
            {isLoaded ? "Change file" : "Upload file"}
          </Button>
        </div>
        <input {...getInputProps()} className="hidden" />
      </div>
    </div>
  );
};
