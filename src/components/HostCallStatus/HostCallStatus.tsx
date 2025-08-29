import React from "react";
import { useAppSelector } from "@/store/hooks";
import { selectHostCallsTrace, selectCurrentHostCallIndex } from "@/store/debugger/debuggerSlice";
import { Activity, CheckCircle } from "lucide-react";

export const HostCallStatus: React.FC = () => {
  const tracesFile = useAppSelector(selectHostCallsTrace);
  const currentIndex = useAppSelector(selectCurrentHostCallIndex);

  if (!tracesFile || tracesFile["host-calls-trace"].length === 0) {
    return null;
  }

  const totalHostCalls = tracesFile["host-calls-trace"].length;
  const isComplete = currentIndex >= totalHostCalls;
  const progress = Math.min((currentIndex / totalHostCalls) * 100, 100);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        {isComplete ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <Activity className="w-4 h-4 text-blue-500" />
        )}
        <span className="font-medium">
          Host Calls: {currentIndex}/{totalHostCalls}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 ease-out rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: isComplete ? "#22c55e" : "#3b82f6",
          }}
        />
      </div>

      {/* Status text */}
      <span className="text-[10px]">{isComplete ? "Complete" : "In Progress"}</span>
    </div>
  );
};
