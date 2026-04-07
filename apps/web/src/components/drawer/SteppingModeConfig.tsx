import { Input } from "@fluffylabs/shared-ui";
import { useCallback } from "react";
import { useDebuggerSettings } from "../../hooks/useDebuggerSettings";
import { STEPPING_MODES, type SteppingMode } from "../../lib/debugger-settings";

export function SteppingModeConfig() {
  const { settings, setSteppingMode, setNInstructionsCount } =
    useDebuggerSettings();
  const { steppingMode, nInstructionsCount } = settings;

  const handleModeChange = useCallback(
    (mode: SteppingMode) => {
      setSteppingMode(mode);
    },
    [setSteppingMode],
  );

  const handleCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (Number.isFinite(val) && val >= 1) {
        setNInstructionsCount(val);
      }
    },
    [setNInstructionsCount],
  );

  return (
    <div data-testid="settings-stepping-mode">
      <h3 className="text-sm font-normal text-foreground mb-1">
        Stepping Mode
      </h3>
      <p className="text-xs text-muted-foreground mb-2">
        Controls how many instructions are executed per step action.
      </p>
      <div className="flex flex-col gap-1.5">
        {STEPPING_MODES.map((mode) => (
          <label
            key={mode.id}
            data-testid={`stepping-mode-${mode.id}`}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name="stepping-mode"
              data-testid={`stepping-radio-${mode.id}`}
              checked={steppingMode === mode.id}
              onChange={() => handleModeChange(mode.id)}
              className="accent-primary cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">
                {mode.label}
              </span>
              <span
                data-testid={`stepping-hint-${mode.id}`}
                className="text-xs text-muted-foreground"
              >
                {mode.hint}
              </span>
            </div>
          </label>
        ))}
      </div>
      {steppingMode === "n_instructions" && (
        <div className="mt-2 flex items-center gap-2">
          <label
            className="text-xs text-muted-foreground"
            htmlFor="n-instructions-count"
          >
            Count:
          </label>
          <Input
            id="n-instructions-count"
            data-testid="n-instructions-count"
            type="number"
            min={1}
            value={nInstructionsCount}
            onChange={handleCountChange}
            className="w-20 h-7 text-xs font-mono"
          />
        </div>
      )}
    </div>
  );
}
