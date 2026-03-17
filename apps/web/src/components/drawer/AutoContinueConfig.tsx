import { useCallback } from "react";
import { AUTO_CONTINUE_OPTIONS, type AutoContinuePolicy } from "../../lib/debugger-settings";
import { useDebuggerSettings } from "../../hooks/useDebuggerSettings";

export function AutoContinueConfig() {
  const { settings, setAutoContinuePolicy } = useDebuggerSettings();
  const { autoContinuePolicy } = settings;

  const handleChange = useCallback(
    (policy: AutoContinuePolicy) => {
      setAutoContinuePolicy(policy);
    },
    [setAutoContinuePolicy],
  );

  return (
    <div data-testid="settings-auto-continue">
      <h3 className="text-sm font-semibold text-foreground mb-1">Host Call Policy</h3>
      <p className="text-xs text-muted-foreground mb-2">
        Controls how the debugger handles host calls during execution. Traces are loaded in the program loader, not here.
      </p>
      <div className="flex flex-col gap-1.5">
        {AUTO_CONTINUE_OPTIONS.map((option) => (
          <label
            key={option.id}
            data-testid={`auto-continue-${option.id}`}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name="auto-continue"
              data-testid={`auto-continue-radio-${option.id}`}
              checked={autoContinuePolicy === option.id}
              onChange={() => handleChange(option.id)}
              className="accent-primary cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">{option.label}</span>
              <span data-testid={`auto-continue-hint-${option.id}`} className="text-xs text-muted-foreground">
                {option.hint}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
