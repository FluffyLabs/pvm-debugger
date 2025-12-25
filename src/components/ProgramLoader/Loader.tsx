import { Button } from "../ui/button";
import { Examples } from "./Examples";
import { useState, useCallback, useEffect } from "react";
import { ProgramUploadFileOutput } from "./types";
import { useDebuggerActions } from "@/hooks/useDebuggerActions";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { setIsProgramEditMode, setSpiArgs } from "@/store/debugger/debuggerSlice.ts";
import { selectIsAnyWorkerLoading } from "@/store/workers/workersSlice";
import { isSerializedError } from "@/store/utils";
import { ProgramFileUpload } from "@/components/ProgramLoader/ProgramFileUpload.tsx";
import { useNavigate } from "react-router";
import { Links } from "./Links";
import { Separator } from "../ui/separator";
import { TriangleAlert } from "lucide-react";
import { bytes } from "@typeberry/lib";
import {
  EntrypointSelector,
  Entrypoint,
  RefineParams,
  AccumulateParams,
  IsAuthorizedParams,
} from "./EntrypointSelector";
import { loadSpiConfig, saveSpiConfig } from "./spiConfig";
import { encodeRefineParams, encodeAccumulateParams, encodeIsAuthorizedParams } from "./spiEncoding";

type LoaderStep = "upload" | "entrypoint";

export const Loader = ({ setIsDialogOpen }: { setIsDialogOpen?: (val: boolean) => void }) => {
  const dispatch = useAppDispatch();
  const [programLoad, setProgramLoad] = useState<ProgramUploadFileOutput>();
  const [error, setError] = useState<string>();
  const [currentStep, setCurrentStep] = useState<LoaderStep>("upload");

  // Load saved config once on mount
  const savedConfig = loadSpiConfig();

  const [selectedEntrypoint, setSelectedEntrypoint] = useState<Entrypoint>(savedConfig.entrypoint);
  const [refineParams, setRefineParams] = useState<RefineParams>(savedConfig.refineParams);
  const [accumulateParams, setAccumulateParams] = useState<AccumulateParams>(savedConfig.accumulateParams);
  const [isAuthorizedParams, setIsAuthorizedParams] = useState<IsAuthorizedParams>(savedConfig.isAuthorizedParams);
  const [isManualMode, setIsManualMode] = useState<boolean>(savedConfig.isManualMode);
  const [encodedSpiArgs, setEncodedSpiArgs] = useState<string>(savedConfig.encodedArgs);
  const [encodingError, setEncodingError] = useState<string | null>(null);
  const [manualPc, setManualPc] = useState<string>(savedConfig.manualPc);
  const debuggerActions = useDebuggerActions();
  const isLoading = useAppSelector(selectIsAnyWorkerLoading);
  const navigate = useNavigate();

  const isProgramLoaded = programLoad !== undefined;
  const isSpiProgram = programLoad?.spiProgram !== null && programLoad?.spiProgram !== undefined;

  useEffect(() => {
    setError("");
  }, [isLoading]);

  // Reset step when program changes
  useEffect(() => {
    setCurrentStep("upload");
  }, [programLoad]);

  // Auto-encode parameters when they change and update PC
  useEffect(() => {
    if (!isSpiProgram) return;

    try {
      let pc: number;
      let encoded: Uint8Array;
      switch (selectedEntrypoint) {
        case "refine":
          pc = 0;
          encoded = encodeRefineParams(refineParams);
          break;
        case "accumulate":
          pc = 5;
          encoded = encodeAccumulateParams(accumulateParams);
          break;
        case "is_authorized":
          pc = 0;
          encoded = encodeIsAuthorizedParams(isAuthorizedParams);
          break;
      }
      setManualPc(pc.toString());
      setEncodedSpiArgs(bytes.BytesBlob.blobFrom(encoded).toString());
      setEncodingError(null);
    } catch (error) {
      setEncodingError(error instanceof Error ? error.message : "Encoding error");
    }
  }, [selectedEntrypoint, refineParams, accumulateParams, isAuthorizedParams, isSpiProgram]);

  const handleLoad = useCallback(
    async (program?: ProgramUploadFileOutput) => {
      if (!programLoad && !program) return;

      dispatch(setIsProgramEditMode(false));

      try {
        const loadedProgram = program || programLoad;
        let modifiedProgram = loadedProgram;

        // For SPI programs, update PC and encode parameters
        if (loadedProgram?.spiProgram) {
          // Parse the encoded SPI arguments (either auto-generated or manually entered)
          const parsedArgs = bytes.BytesBlob.parseBlob(encodedSpiArgs);

          // Set the encoded parameters as SPI arguments
          dispatch(setSpiArgs(parsedArgs.raw));

          // Update the initial state with the correct PC for the entrypoint
          const pc = parseInt(manualPc, 10) || 0;
          modifiedProgram = {
            ...loadedProgram,
            initial: {
              ...loadedProgram.initial,
              pc,
            },
          };
        }

        await debuggerActions.handleProgramLoad(modifiedProgram);

        // Save SPI configuration to localStorage after successful load
        if (loadedProgram?.spiProgram) {
          saveSpiConfig({
            entrypoint: selectedEntrypoint,
            refineParams,
            accumulateParams,
            isAuthorizedParams,
            isManualMode,
            manualPc,
            encodedArgs: encodedSpiArgs,
          });
        }

        setIsDialogOpen?.(false);
        navigate("/", { replace: true });
      } catch (error) {
        if (error instanceof Error || isSerializedError(error)) {
          setError(error.message);
        } else {
          setError("Unknown error occurred");
        }
      }
    },
    [
      dispatch,
      programLoad,
      debuggerActions,
      setIsDialogOpen,
      navigate,
      encodedSpiArgs,
      manualPc,
      selectedEntrypoint,
      refineParams,
      accumulateParams,
      isAuthorizedParams,
      isManualMode,
    ],
  );

  const handleNextStep = () => {
    if (currentStep === "upload" && isSpiProgram) {
      setCurrentStep("entrypoint");
    } else {
      handleLoad();
    }
  };

  const handleBackStep = () => {
    setCurrentStep("upload");
  };

  return (
    <div className="flex flex-col w-full h-full bg-card pb-3 min-w-[50vw]">
      <p className="sm:mb-4 bg-brand-dark dark:bg-brand/65 text-white text-xs font-light px-3 pt-3 pb-2">
        {currentStep === "upload"
          ? "Start with an example program or upload your file"
          : "Select entrypoint for SPI program"}
      </p>
      <div className="flex flex-col px-7 pt-[30px] h-full overflow-auto">
        {currentStep === "upload" && (
          <>
            <Examples
              onProgramLoad={(val) => {
                setProgramLoad(val);
                // For non-SPI programs, load directly. For SPI programs, go to entrypoint selection
                if (val.spiProgram === null) {
                  handleLoad(val);
                }
              }}
            />

            <div className="my-10">
              <ProgramFileUpload onFileUpload={setProgramLoad} isError={error !== undefined} setError={setError} />
            </div>
            {error && (
              <p className="flex items-top text-destructive-foreground text-[11px] whitespace-pre-line">
                <TriangleAlert className="mr-2" height="18px" /> {error}
              </p>
            )}
            {!error && programLoad && (
              <div className="text-xs">
                <div className="mt-2 flex justify-between items-center">
                  <span className="block text-xs font-bold min-w-[150px]">Detected:</span>
                  <code className="flex-1 ml-2"> {programLoad.kind}</code>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="block text-xs font-bold min-w-[150px]">Name:</span>
                  <code className="flex-1 ml-2">{programLoad.name}</code>
                </div>
                <div className="mt-2 flex items-center">
                  <span className="block text-xs font-bold min-w-[150px]">Initial state:</span>
                  <details open={false} className="flex-1 ml-2">
                    <summary>view</summary>
                    <pre>{JSON.stringify(programLoad.initial, null, 2)}</pre>
                  </details>
                </div>
              </div>
            )}
            {!error && !programLoad && <Links />}
          </>
        )}

        {currentStep === "entrypoint" && (
          <div className="min-h-[400px]">
            <EntrypointSelector
              selectedEntrypoint={selectedEntrypoint}
              onEntrypointChange={setSelectedEntrypoint}
              refineParams={refineParams}
              onRefineParamsChange={setRefineParams}
              accumulateParams={accumulateParams}
              manualPc={manualPc}
              onManualPcChange={setManualPc}
              onAccumulateParamsChange={setAccumulateParams}
              isAuthorizedParams={isAuthorizedParams}
              onIsAuthorizedParamsChange={setIsAuthorizedParams}
              encodedSpiArgs={encodedSpiArgs}
              onEncodedSpiArgsChange={setEncodedSpiArgs}
              encodingError={encodingError}
              isManualMode={isManualMode}
              onIsManualModeChange={setIsManualMode}
            />
          </div>
        )}
      </div>
      <div className="px-5 mt-[30px]">
        <Separator />
      </div>
      <div className="m-6 mb-7 flex justify-between">
        {currentStep === "entrypoint" && (
          <Button className="mt-3 min-w-[92px]" type="button" variant="outline" onClick={handleBackStep}>
            Back
          </Button>
        )}
        <div className="flex-1" />
        <Button
          className="mt-3 min-w-[92px]"
          id="load-button"
          type="button"
          disabled={!isProgramLoaded}
          onClick={currentStep === "entrypoint" ? () => handleLoad() : handleNextStep}
        >
          {currentStep === "entrypoint" || !isSpiProgram ? "Load" : "Next"}
        </Button>
      </div>
    </div>
  );
};
