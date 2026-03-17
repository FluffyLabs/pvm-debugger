import { PvmSelectionConfig } from "./PvmSelectionConfig";
import { SteppingModeConfig } from "./SteppingModeConfig";
import { AutoContinueConfig } from "./AutoContinueConfig";

interface SettingsTabProps {
  onPvmChange: (ids: string[]) => void;
}

export function SettingsTab({ onPvmChange }: SettingsTabProps) {
  return (
    <div data-testid="settings-tab" className="flex flex-col gap-4">
      <PvmSelectionConfig onPvmChange={onPvmChange} />
      <div className="border-t border-border" />
      <SteppingModeConfig />
      <div className="border-t border-border" />
      <AutoContinueConfig />
    </div>
  );
}
