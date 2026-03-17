import { useContext } from "react";
import { DebuggerSettingsContext, type DebuggerSettingsContextValue } from "../context/debugger-settings";

export function useDebuggerSettings(): DebuggerSettingsContextValue {
  const ctx = useContext(DebuggerSettingsContext);
  if (!ctx) {
    throw new Error("useDebuggerSettings must be used inside <DebuggerSettingsProvider>");
  }
  return ctx;
}
