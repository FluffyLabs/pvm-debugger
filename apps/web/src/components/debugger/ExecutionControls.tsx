import { Button } from "@fluffylabs/shared-ui";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@fluffylabs/shared-ui/ui/tooltip";
import {
  ArrowLeft,
  ListOrdered,
  Pause,
  Play,
  RotateCcw,
  StepForward,
} from "lucide-react";
import type { SteppingMode } from "../../lib/debugger-settings";

interface ExecutionControlsProps {
  onNext: () => void;
  onStep: () => void;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  onLoad: () => void;
  canStep: boolean;
  isRunning: boolean;
  isTerminated: boolean;
  /** Current stepping mode (affects Next button label). */
  steppingMode: SteppingMode;
  /** N count for n_instructions mode. */
  nInstructionsCount: number;
}

function nextLabel(mode: SteppingMode, n: number): string {
  switch (mode) {
    case "instruction":
      return "Step";
    case "block":
      return "Block";
    case "n_instructions":
      return `Next(${n})`;
  }
}

function nextTooltip(mode: SteppingMode, n: number): string {
  switch (mode) {
    case "instruction":
      return "Execute next instruction (Ctrl+Shift+N)";
    case "block":
      return "Execute next block (Ctrl+Shift+N)";
    case "n_instructions":
      return `Execute ${n} instructions (Ctrl+Shift+N)`;
  }
}

export function ExecutionControls({
  onNext,
  onStep,
  onRun,
  onPause,
  onReset,
  onLoad,
  canStep,
  isRunning,
  isTerminated,
  steppingMode,
  nInstructionsCount,
}: ExecutionControlsProps) {
  const showStepButton = steppingMode !== "instruction";

  return (
    <div data-testid="execution-controls" className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="tertiary"
            size="sm"
            data-testid="load-button"
            aria-label="Load"
            onClick={onLoad}
            className="cursor-pointer gap-1.5 shadow-none text-xs px-2 py-1 h-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Load
          </Button>
        </TooltipTrigger>
        <TooltipContent>Go to load screen</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="tertiary"
            size="sm"
            data-testid="reset-button"
            aria-label="Reset"
            onClick={onReset}
            className="cursor-pointer gap-1.5 shadow-none text-xs px-2 py-1 h-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reset (Ctrl+Shift+R)</TooltipContent>
      </Tooltip>

      <div className="h-4 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="tertiary"
            size="sm"
            data-testid="next-button"
            aria-label="Next"
            onClick={onNext}
            disabled={!canStep || isRunning}
            className="cursor-pointer gap-1.5 shadow-none text-xs px-2 py-1 h-auto"
          >
            <StepForward className="h-3.5 w-3.5" />
            {nextLabel(steppingMode, nInstructionsCount)}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {nextTooltip(steppingMode, nInstructionsCount)}
        </TooltipContent>
      </Tooltip>

      {showStepButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="tertiary"
              size="sm"
              data-testid="step-button"
              aria-label="Step 1 instruction"
              onClick={onStep}
              disabled={!canStep || isRunning}
              className="cursor-pointer gap-1.5 shadow-none text-xs px-2 py-1 h-auto"
            >
              <ListOrdered className="h-3.5 w-3.5" />
              Step
            </Button>
          </TooltipTrigger>
          <TooltipContent>Step 1 instruction (Ctrl+Shift+S)</TooltipContent>
        </Tooltip>
      )}

      <div className="h-4 w-px bg-border" />

      {isRunning ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              key="pause"
              variant="tertiary"
              size="sm"
              data-testid="pause-button"
              aria-label="Pause"
              onClick={onPause}
              className="cursor-pointer gap-1.5 shadow-none text-xs px-2 py-1 h-auto"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pause (Ctrl+Shift+P)</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              key="run"
              variant="tertiary"
              size="sm"
              data-testid="run-button"
              aria-label="Run"
              onClick={onRun}
              disabled={isTerminated}
              className="cursor-pointer gap-1.5 shadow-none text-xs px-2 py-1 h-auto"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </Button>
          </TooltipTrigger>
          <TooltipContent>Run (Ctrl+Shift+P)</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
