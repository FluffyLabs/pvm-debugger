import { ArrowLeft, RotateCcw, StepForward, Play, Pause } from "lucide-react";

interface ExecutionControlsProps {
  onNext: () => void;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  onLoad: () => void;
  canStep: boolean;
  isRunning: boolean;
  isTerminated: boolean;
}

const btnClass =
  "flex items-center gap-1.5 rounded border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground cursor-pointer hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed";

export function ExecutionControls({
  onNext,
  onRun,
  onPause,
  onReset,
  onLoad,
  canStep,
  isRunning,
  isTerminated,
}: ExecutionControlsProps) {
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

      <div className="h-4 w-px bg-border" />

      {isRunning ? (
        <button
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
