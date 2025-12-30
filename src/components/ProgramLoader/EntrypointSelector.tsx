import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Input } from "../ui/input";
import { WithHelp } from "../WithHelp/WithHelp";
import { Switch } from "../ui/switch";
import { cn } from "@/lib/utils";

export type RefineParams = {
  core: string;
  index: string;
  id: string;
  payload: string;
  package: string;
};

export type AccumulateParams = {
  slot: string;
  id: string;
  results: string;
};

export type IsAuthorizedParams = {
  core: string;
};

export type Entrypoint = "refine" | "accumulate" | "is_authorized";

type EntrypointSelectorProps = {
  selectedEntrypoint: Entrypoint;
  onEntrypointChange: (entrypoint: Entrypoint) => void;
  refineParams: RefineParams;
  onRefineParamsChange: (params: RefineParams) => void;
  accumulateParams: AccumulateParams;
  onAccumulateParamsChange: (params: AccumulateParams) => void;
  isAuthorizedParams: IsAuthorizedParams;
  onIsAuthorizedParamsChange: (params: IsAuthorizedParams) => void;
  encodedSpiArgs: string;
  onEncodedSpiArgsChange: (args: string) => void;
  encodingError: string | null;
  manualPc: string;
  onManualPcChange: (pc: string) => void;
  isManualMode: boolean;
  onIsManualModeChange: (mode: boolean) => void;
};

export const EntrypointSelector = ({
  selectedEntrypoint,
  onEntrypointChange,
  refineParams,
  onRefineParamsChange,
  accumulateParams,
  onAccumulateParamsChange,
  isAuthorizedParams,
  onIsAuthorizedParamsChange,
  encodedSpiArgs,
  onEncodedSpiArgsChange,
  encodingError,
  manualPc,
  onManualPcChange,
  isManualMode,
  onIsManualModeChange,
}: EntrypointSelectorProps) => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{isManualMode ? "Manual Configuration" : "Select Entrypoint"}</h3>
        <div className="flex items-center gap-2">
          <Switch
            variant={!isManualMode ? "secondary" : undefined}
            id="manual-mode"
            data-testid="manual-mode-switch"
            checked={isManualMode}
            onCheckedChange={onIsManualModeChange}
          />
          <Label htmlFor="manual-mode" className="text-xs cursor-pointer">
            RAW
          </Label>
        </div>
      </div>

      {!isManualMode && (
        <RadioGroup
          value={selectedEntrypoint}
          onValueChange={(value) => onEntrypointChange(value as Entrypoint)}
          className="flex flex-row gap-4"
        >
          <div
            className="flex items-center space-x-2 border rounded-lg px-4 py-2 hover:bg-accent cursor-pointer flex-1"
            data-testid="entrypoint-refine"
            onClick={() => onEntrypointChange("refine")}
          >
            <RadioGroupItem value="refine" id="refine" />
            <Label htmlFor="refine" className="cursor-pointer font-medium text-sm">
              Refine
            </Label>
          </div>

          <div
            className="flex items-center space-x-2 border rounded-lg px-4 py-2 hover:bg-accent cursor-pointer flex-1"
            data-testid="entrypoint-accumulate"
            onClick={() => onEntrypointChange("accumulate")}
          >
            <RadioGroupItem value="accumulate" id="accumulate" />
            <Label htmlFor="accumulate" className="cursor-pointer font-medium text-sm">
              Accumulate
            </Label>
          </div>

          <div
            className="flex items-center space-x-2 border rounded-lg px-4 py-2 hover:bg-accent cursor-pointer flex-1"
            data-testid="entrypoint-is-authorized"
            onClick={() => onEntrypointChange("is_authorized")}
          >
            <RadioGroupItem value="is_authorized" id="is_authorized" />
            <Label htmlFor="is_authorized" className="cursor-pointer font-medium text-sm">
              Is Authorized
            </Label>
          </div>
        </RadioGroup>
      )}

      {isManualMode && (
        <div className="space-y-3 pt-4 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground">Entrypoint</h4>

          <div className="flex items-center gap-2">
            <Label htmlFor="manual-pc" className="text-xs min-w-[120px]">
              <WithHelp help="Program Counter - the starting address for execution">Program Counter</WithHelp>
            </Label>
            <Input
              id="manual-pc"
              data-testid="manual-pc"
              type="number"
              className="text-xs flex-1"
              placeholder="0"
              value={manualPc}
              onChange={(e) => onManualPcChange(e.target.value)}
            />
          </div>
        </div>
      )}

      {selectedEntrypoint === "refine" && !isManualMode && (
        <div className="space-y-3 mt-4 pt-4 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground">Refine Parameters</h4>

          <div className="flex items-center gap-2">
            <Label htmlFor="refine-core" className="text-xs min-w-[120px]">
              <WithHelp
                help={
                  <>
                    The core index <code className="font-mono">(c)</code>
                  </>
                }
              >
                Core
              </WithHelp>
            </Label>
            <Input
              id="refine-core"
              data-testid="refine-core"
              type="number"
              className="text-xs flex-1"
              placeholder="0"
              value={refineParams.core}
              onChange={(e) => onRefineParamsChange({ ...refineParams, core: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="refine-index" className="text-xs min-w-[120px]">
              <WithHelp
                help={
                  <>
                    The work item index <code className="font-mono">(i)</code>
                  </>
                }
              >
                Index
              </WithHelp>
            </Label>
            <Input
              id="refine-index"
              data-testid="refine-index"
              type="number"
              className="text-xs flex-1"
              placeholder="0"
              value={refineParams.index}
              onChange={(e) => onRefineParamsChange({ ...refineParams, index: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="refine-id" className="text-xs min-w-[120px]">
              <WithHelp
                help={
                  <>
                    The service id <code className="font-mono">(w_s)</code>
                  </>
                }
              >
                Service ID
              </WithHelp>
            </Label>
            <Input
              id="refine-id"
              data-testid="refine-id"
              type="number"
              className="text-xs flex-1"
              placeholder="0"
              value={refineParams.id}
              onChange={(e) => onRefineParamsChange({ ...refineParams, id: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="refine-payload" className="text-xs min-w-[120px]">
              <WithHelp
                help={
                  <>
                    The payload as hex <code className="font-mono">(y)</code>
                  </>
                }
              >
                Payload
              </WithHelp>
            </Label>
            <Input
              id="refine-payload"
              data-testid="refine-payload"
              className="text-xs flex-1"
              placeholder="0x..."
              value={refineParams.payload}
              onChange={(e) => onRefineParamsChange({ ...refineParams, payload: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="refine-package" className="text-xs min-w-[120px]">
              <WithHelp
                help={
                  <>
                    The work package hash <code className="font-mono">(p)</code>
                  </>
                }
              >
                Package Hash
              </WithHelp>
            </Label>
            <Input
              id="refine-package"
              data-testid="refine-package"
              className="text-xs flex-1"
              placeholder="0x..."
              value={refineParams.package}
              onChange={(e) => onRefineParamsChange({ ...refineParams, package: e.target.value })}
            />
          </div>
        </div>
      )}

      {selectedEntrypoint === "accumulate" && !isManualMode && (
        <div className="space-y-3 mt-4 pt-4 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground">Accumulate Parameters</h4>

          <div className="flex items-center gap-2">
            <Label htmlFor="accumulate-slot" className="text-xs min-w-[120px]">
              <WithHelp
                help={
                  <>
                    Timeslot for the current accumulation <code className="font-mono">(N_t)</code>
                  </>
                }
              >
                Timeslot
              </WithHelp>
            </Label>
            <Input
              id="accumulate-slot"
              data-testid="accumulate-slot"
              type="number"
              className="text-xs flex-1"
              placeholder="0"
              value={accumulateParams.slot}
              onChange={(e) => onAccumulateParamsChange({ ...accumulateParams, slot: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="accumulate-id" className="text-xs min-w-[120px]">
              <WithHelp
                help={
                  <>
                    The service id of the caller <code className="font-mono">(N_s)</code>
                  </>
                }
              >
                Service ID
              </WithHelp>
            </Label>
            <Input
              id="accumulate-id"
              data-testid="accumulate-id"
              type="number"
              className="text-xs flex-1"
              placeholder="0"
              value={accumulateParams.id}
              onChange={(e) => onAccumulateParamsChange({ ...accumulateParams, id: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="accumulate-results" className="text-xs min-w-[120px]">
              <WithHelp
                help={
                  <>
                    The count of operands <code className="font-mono">(|o|)</code>
                  </>
                }
              >
                Results
              </WithHelp>
            </Label>
            <Input
              id="accumulate-results"
              data-testid="accumulate-results"
              type="number"
              className="text-xs flex-1"
              placeholder="0"
              value={accumulateParams.results}
              onChange={(e) => onAccumulateParamsChange({ ...accumulateParams, results: e.target.value })}
            />
          </div>
        </div>
      )}

      {selectedEntrypoint === "is_authorized" && !isManualMode && (
        <div className="space-y-3 mt-4 pt-4 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground">Is Authorized Parameters</h4>

          <div className="flex items-center gap-2">
            <Label htmlFor="is-authorized-core" className="text-xs min-w-[120px]">
              <WithHelp
                help={
                  <>
                    The core index <code className="font-mono">(c)</code>
                  </>
                }
              >
                Core
              </WithHelp>
            </Label>
            <Input
              id="is-authorized-core"
              data-testid="is-authorized-core"
              type="number"
              className="text-xs flex-1"
              placeholder="0"
              value={isAuthorizedParams.core}
              onChange={(e) => onIsAuthorizedParamsChange({ core: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* SPI Arguments Section */}
      <div className="space-y-3 mt-4 pt-4 border-t">
        <h4 className="text-xs font-semibold text-muted-foreground">
          SPI Arguments {isManualMode ? "" : "(Auto-generated)"}
        </h4>

        <div className="flex flex-col gap-2">
          <Label htmlFor="spi-args" className="text-xs">
            <WithHelp help="Hex-encoded JAM SPI arguments written to the heap">Arguments</WithHelp>
          </Label>
          <Input
            id="spi-args"
            data-testid="spi-args"
            className={cn("text-xs font-mono", {
              "border-red-500": encodingError !== null,
              "bg-muted": !isManualMode,
            })}
            placeholder="0x-prefixed, encoded operands"
            value={encodedSpiArgs}
            onChange={(e) => onEncodedSpiArgsChange(e.target.value)}
            readOnly={!isManualMode}
          />
          {encodingError && <p className="text-xs text-red-500">{encodingError}</p>}
        </div>
      </div>
    </div>
  );
};
