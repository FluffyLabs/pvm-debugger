import { StepForward } from "lucide-react";

interface ExecutionControlsProps {
  onNext: () => void;
  canStep: boolean;
}

export function ExecutionControls({ onNext, canStep }: ExecutionControlsProps) {
  return (
    <div data-testid="execution-controls" className="flex items-center gap-2">
      <button
        data-testid="next-button"
        aria-label="Next"
        onClick={onNext}
        disabled={!canStep}
        className="flex items-center gap-1.5 rounded border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground cursor-pointer hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <StepForward className="h-3.5 w-3.5" />
        Next
      </button>
    </div>
  );
}
