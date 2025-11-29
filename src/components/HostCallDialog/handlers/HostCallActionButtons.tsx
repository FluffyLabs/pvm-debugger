import { Button } from "@/components/ui/button";
import { Play, StepForward, SkipForward } from "lucide-react";
import { HostCallResumeMode } from "@/store/workers/workersSlice";

interface HostCallActionButtonsProps {
  onResume: (mode: HostCallResumeMode) => void;
  disabled?: boolean;
}

export const HostCallActionButtons: React.FC<HostCallActionButtonsProps> = ({ onResume, disabled }) => {
  return (
    <div className="flex gap-2 pt-2">
      <Button variant="secondary" onClick={() => onResume("run")} disabled={disabled}>
        <Play className="w-3.5 mr-1.5" />
        Run
      </Button>
      <Button variant="secondary" onClick={() => onResume("step")} disabled={disabled}>
        <StepForward className="w-3.5 mr-1.5" />
        Step
      </Button>
      <Button variant="secondary" onClick={() => onResume("block")} disabled={disabled}>
        <SkipForward className="w-3.5 mr-1.5" />
        Block
      </Button>
    </div>
  );
};
