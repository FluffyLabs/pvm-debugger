import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { EntrypointSelector, Entrypoint } from "../ProgramLoader/EntrypointSelector";
import { loadSpiConfig, saveSpiConfig } from "../ProgramLoader/spiConfig";
import { encodeRefineParams, encodeAccumulateParams, encodeIsAuthorizedParams } from "../ProgramLoader/spiEncoding";
import * as bytes from "@typeberry/lib/bytes";
import { Separator } from "../ui/separator";
import { useAppSelector } from "@/store/hooks";

type SpiConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (encodedArgs: Uint8Array, pc: number, serviceId: number) => void;
};

export const SpiConfigDialog = ({ open, onOpenChange, onApply }: SpiConfigDialogProps) => {
  const savedConfig = loadSpiConfig();
  const globalServiceId = useAppSelector((state) => state.debugger.serviceId);

  const [selectedEntrypoint, setSelectedEntrypoint] = useState<Entrypoint>(savedConfig.entrypoint);
  const [refineParams, setRefineParams] = useState(savedConfig.refineParams);
  const [accumulateParams, setAccumulateParams] = useState(savedConfig.accumulateParams);
  const [isAuthorizedParams, setIsAuthorizedParams] = useState(savedConfig.isAuthorizedParams);
  const [isManualMode, setIsManualMode] = useState(savedConfig.isManualMode);
  const [encodedSpiArgs, setEncodedSpiArgs] = useState(savedConfig.encodedArgs);
  const [encodingError, setEncodingError] = useState<string | null>(null);
  const [manualPc, setManualPc] = useState(savedConfig.manualPc);

  // Sync service ID from global settings when dialog opens
  useEffect(() => {
    if (open && globalServiceId !== null) {
      const serviceIdStr = globalServiceId.toString();
      setRefineParams((prev) => ({ ...prev, id: serviceIdStr }));
      setAccumulateParams((prev) => ({ ...prev, id: serviceIdStr }));
    }
  }, [open, globalServiceId]);

  // Auto-encode parameters when they change
  const handleAutoEncode = () => {
    if (isManualMode) return;

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
  };

  // Re-encode when parameters change
  useEffect(() => {
    handleAutoEncode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntrypoint, refineParams, accumulateParams, isAuthorizedParams, isManualMode]);

  const handleApply = () => {
    try {
      const parsedArgs = bytes.BytesBlob.parseBlob(encodedSpiArgs);
      const pc = parseInt(manualPc, 10) || 0;

      // Extract service ID from the current entrypoint parameters
      let serviceId: number;
      switch (selectedEntrypoint) {
        case "refine":
          serviceId = parseInt(refineParams.id, 10) || 0;
          break;
        case "accumulate":
          serviceId = parseInt(accumulateParams.id, 10) || 0;
          break;
        case "is_authorized":
          // is_authorized doesn't have a service ID parameter, use global
          serviceId = globalServiceId ?? 0;
          break;
      }

      // Save configuration
      saveSpiConfig({
        entrypoint: selectedEntrypoint,
        refineParams,
        accumulateParams,
        isAuthorizedParams,
        isManualMode,
        manualPc,
        encodedArgs: encodedSpiArgs,
      });

      onApply(parsedArgs.raw, pc, serviceId);
      onOpenChange(false);
    } catch (error) {
      setEncodingError(error instanceof Error ? error.message : "Invalid SPI arguments");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 pb-4 flex flex-col md:min-w-[680px] max-h-[90vh]">
        <DialogHeader className="py-3 px-6 bg-title text-title-foreground rounded-t-lg border-b">
          <DialogTitle className="text-base">Configure SPI Entrypoint</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col px-7 pt-[30px] h-full overflow-auto">
          <EntrypointSelector
            selectedEntrypoint={selectedEntrypoint}
            onEntrypointChange={setSelectedEntrypoint}
            refineParams={refineParams}
            onRefineParamsChange={setRefineParams}
            accumulateParams={accumulateParams}
            onAccumulateParamsChange={setAccumulateParams}
            isAuthorizedParams={isAuthorizedParams}
            onIsAuthorizedParamsChange={setIsAuthorizedParams}
            encodedSpiArgs={encodedSpiArgs}
            onEncodedSpiArgsChange={setEncodedSpiArgs}
            encodingError={encodingError}
            isManualMode={isManualMode}
            onIsManualModeChange={setIsManualMode}
            manualPc={manualPc}
            onManualPcChange={setManualPc}
          />
        </div>
        <div className="px-5 mt-[30px]">
          <Separator />
        </div>
        <div className="flex justify-end gap-3 px-7 mt-4">
          <Button variant="outline" data-testid="spi-cancel-button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button data-testid="spi-apply-button" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
