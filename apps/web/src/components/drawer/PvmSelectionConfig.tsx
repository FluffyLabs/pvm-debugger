import { useCallback } from "react";
import { Switch, Alert } from "@fluffylabs/shared-ui";
import { AVAILABLE_PVMS } from "../../lib/debugger-settings";
import { useDebuggerSettings } from "../../hooks/useDebuggerSettings";

interface PvmSelectionConfigProps {
  onPvmChange: (ids: string[]) => void;
}

export function PvmSelectionConfig({ onPvmChange }: PvmSelectionConfigProps) {
  const { settings, setSelectedPvmIds } = useDebuggerSettings();
  const { selectedPvmIds } = settings;

  const handleToggle = useCallback(
    (pvmId: string, enabled: boolean) => {
      let next: string[];
      if (enabled) {
        next = [...selectedPvmIds, pvmId];
      } else {
        next = selectedPvmIds.filter((id) => id !== pvmId);
      }
      // Prevent disabling the last PVM
      if (next.length === 0) return;

      setSelectedPvmIds(next);
      onPvmChange(next);
    },
    [selectedPvmIds, setSelectedPvmIds, onPvmChange],
  );

  return (
    <div data-testid="settings-pvm-selection">
      <h3 className="text-sm font-normal text-foreground mb-1">PVM Selection</h3>
      <p className="text-xs text-muted-foreground mb-2">
        Choose which PVM interpreters to run. Changing this will reset the debugger to its initial state.
      </p>
      <div className="flex flex-col gap-2 mb-2">
        {AVAILABLE_PVMS.map((pvm) => {
          const isEnabled = selectedPvmIds.includes(pvm.id);
          const isLastEnabled = isEnabled && selectedPvmIds.length === 1;
          return (
            <label
              key={pvm.id}
              data-testid={`pvm-toggle-${pvm.id}`}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Switch
                data-testid={`pvm-switch-${pvm.id}`}
                checked={isEnabled}
                disabled={isLastEnabled}
                onCheckedChange={(checked: boolean) => handleToggle(pvm.id, checked)}
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">{pvm.label}</span>
                <span data-testid={`pvm-hint-${pvm.id}`} className="text-xs text-muted-foreground">
                  {pvm.hint}
                </span>
              </div>
            </label>
          );
        })}
      </div>
      <Alert data-testid="pvm-change-warning" className="text-xs">
        Changing PVM selection resets the current debugging session.
      </Alert>
    </div>
  );
}
