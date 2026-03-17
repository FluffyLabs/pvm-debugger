import { PvmSelectionConfig } from "./PvmSelectionConfig";
import { SteppingModeConfig } from "./SteppingModeConfig";
import { AutoContinueConfig } from "./AutoContinueConfig";

interface SettingsTabProps {
  onPvmChange: (ids: string[]) => void;
}

export function SettingsTab({ onPvmChange }: SettingsTabProps) {
  return (
    <div data-testid="settings-tab" className="grid grid-cols-3 gap-4">
      <PvmSelectionConfig onPvmChange={onPvmChange} />
      <SteppingModeConfig />
      <AutoContinueConfig />
    </div>
  );
}
