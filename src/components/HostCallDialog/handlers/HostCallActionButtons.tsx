import { Button } from "@/components/ui/button";
import { Play, StepForward, SkipForward } from "lucide-react";
import { HostCallResumeMode } from "@/store/workers/workersSlice";

interface HostCallActionButtonsProps {
  onResume: (mode: HostCallResumeMode) => void;
  onRestart?: () => void;
  disabled?: boolean;
}

export const HostCallActionButtons: React.FC<HostCallActionButtonsProps> = ({ onResume, onRestart, disabled }) => {
  return (
    <div className="flex items-center pt-2">
      {onRestart && (
        <button
          className="text-sm text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
          onClick={onRestart}
          disabled={disabled}
        >
          restart
        </button>
      )}
      <div className="flex gap-2 ml-auto">
        <Button variant="secondary" onClick={() => onResume("block")} disabled={disabled}>
          <SkipForward className="w-3.5 mr-1.5" />
          Block
        </Button>
        <Button variant="secondary" onClick={() => onResume("step")} disabled={disabled}>
          <StepForward className="w-3.5 mr-1.5" />
          Step
        </Button>
        <Button onClick={() => onResume("run")} disabled={disabled}>
          <Play className="w-3.5 mr-1.5" />
          Run
        </Button>
      </div>
    </div>
  );
};
