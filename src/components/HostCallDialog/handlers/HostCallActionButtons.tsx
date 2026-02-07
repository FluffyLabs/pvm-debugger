import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, StepForward, SkipForward } from "lucide-react";
import { HostCallResumeMode } from "@/store/workers/workersSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectAutoContinueOnHostCalls,
  selectHostCallsTrace,
  setAutoContinueOnHostCalls,
} from "@/store/debugger/debuggerSlice";

interface HostCallActionButtonsProps {
  onResume: (mode: HostCallResumeMode) => void;
  onRestart?: () => void;
  disabled?: boolean;
}

export const HostCallActionButtons: React.FC<HostCallActionButtonsProps> = ({ onResume, onRestart, disabled }) => {
  const dispatch = useAppDispatch();
  const hasTrace = useAppSelector(selectHostCallsTrace) !== null;
  const autoContinue = useAppSelector(selectAutoContinueOnHostCalls);

  return (
    <div className="flex items-center pt-2">
      {onRestart && (
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
          onClick={onRestart}
          disabled={disabled}
        >
          restart
        </button>
      )}
      {hasTrace && (
        <div className="flex items-center gap-2 ml-4">
          <Switch
            id="auto-continue-dialog"
            variant={!autoContinue ? "secondary" : undefined}
            checked={autoContinue}
            onCheckedChange={(checked: boolean) => dispatch(setAutoContinueOnHostCalls(checked))}
            disabled={disabled}
          />
          <Label htmlFor="auto-continue-dialog" className="text-sm cursor-pointer">
            Break only on mismatch
          </Label>
        </div>
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
