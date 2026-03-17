import { ArrowLeft, RotateCcw, StepForward, Play, Pause, ListOrdered } from "lucide-react";
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
  steppingMode: SteppingMode;
  nInstructionsCount: number;
}

function stepTooltip(mode: SteppingMode, n: number): string {
  switch (mode) {
    case "instruction":
      return "Step 1 instruction";
    case "block":
      return "Step to block boundary";
    case "n_instructions":
      return `Step ${n} instructions`;
  }
}

const btnClass =
  "flex items-center gap-1.5 rounded border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground cursor-pointer hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed";

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
  const tooltip = stepTooltip(steppingMode, nInstructionsCount);
  return (
    <div data-testid="execution-controls" className="flex items-center gap-2">
      <button
        data-testid="load-button"
        aria-label="Load"
        onClick={onLoad}
        className={btnClass}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Load
      </button>

      <button
        data-testid="reset-button"
        aria-label="Reset"
        onClick={onReset}
        className={btnClass}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>

      <div className="h-4 w-px bg-border" />

      <button
        data-testid="next-button"
        aria-label="Next"
        onClick={onNext}
        disabled={!canStep || isRunning}
        className={btnClass}
      >
        <StepForward className="h-3.5 w-3.5" />
        Next
      </button>

      <button
        data-testid="step-button"
        aria-label={tooltip}
        title={tooltip}
        onClick={onStep}
        disabled={!canStep || isRunning}
        className={btnClass}
      >
        <ListOrdered className="h-3.5 w-3.5" />
        Step
      </button>

      <div className="h-4 w-px bg-border" />

      {isRunning ? (
        <button
          key="pause"
          data-testid="pause-button"
          aria-label="Pause"
          onClick={onPause}
          className={btnClass}
        >
          <Pause className="h-3.5 w-3.5" />
          Pause
        </button>
      ) : (
        <button
          key="run"
          data-testid="run-button"
          aria-label="Run"
          onClick={onRun}
          disabled={isTerminated}
          className={btnClass}
        >
          <Play className="h-3.5 w-3.5" />
          Run
        </button>
      )}
    </div>
  );
}
