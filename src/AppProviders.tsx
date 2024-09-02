import { createContext } from "react";
import { initialMemoryState, useMemoryFeatureState } from "./components/MemoryPreview/hooks/memoryFeature";

export const Store = createContext({
  memory: initialMemoryState,
});

export const WithStore = ({ children }: { children: React.ReactNode }) => {
  const state = useMemoryFeatureState();
  return <Store.Provider value={{ memory: state }}>{children}</Store.Provider>;
};
