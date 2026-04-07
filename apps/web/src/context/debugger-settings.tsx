import { createContext, type ReactNode, useCallback, useState } from "react";
import {
  type AutoContinuePolicy,
  type DebuggerSettings,
  loadSettings,
  type SteppingMode,
  saveSettings,
} from "../lib/debugger-settings";

export interface DebuggerSettingsContextValue {
  settings: DebuggerSettings;
  setSelectedPvmIds: (ids: string[]) => void;
  setSteppingMode: (mode: SteppingMode) => void;
  setNInstructionsCount: (count: number) => void;
  setAutoContinuePolicy: (policy: AutoContinuePolicy) => void;
}

export const DebuggerSettingsContext =
  createContext<DebuggerSettingsContextValue | null>(null);

export function DebuggerSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<DebuggerSettings>(loadSettings);

  const update = useCallback((patch: Partial<DebuggerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const setSelectedPvmIds = useCallback(
    (ids: string[]) => update({ selectedPvmIds: ids }),
    [update],
  );

  const setSteppingMode = useCallback(
    (mode: SteppingMode) => update({ steppingMode: mode }),
    [update],
  );

  const setNInstructionsCount = useCallback(
    (count: number) => update({ nInstructionsCount: count }),
    [update],
  );

  const setAutoContinuePolicy = useCallback(
    (policy: AutoContinuePolicy) => update({ autoContinuePolicy: policy }),
    [update],
  );

  return (
    <DebuggerSettingsContext.Provider
      value={{
        settings,
        setSelectedPvmIds,
        setSteppingMode,
        setNInstructionsCount,
        setAutoContinuePolicy,
      }}
    >
      {children}
    </DebuggerSettingsContext.Provider>
  );
}
