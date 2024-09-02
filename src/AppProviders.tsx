import { createContext } from "react";
import { initialMemoryState, useMemoryFeatureState } from "./components/MemoryPreview/hooks/memoryFeature";
import { worker } from "./packages/web-worker";

export const Store = createContext({
  memory: initialMemoryState,
  worker,
});

export const WithStore = ({ children }: { children: React.ReactNode }) => {
  const memory = useMemoryFeatureState();
  return <Store.Provider value={{ memory, worker }}>{children}</Store.Provider>;
};
