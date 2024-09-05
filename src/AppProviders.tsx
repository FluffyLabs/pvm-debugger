import { createContext, useEffect, useState } from "react";
import { initialMemoryState, useMemoryFeatureState } from "./components/MemoryPreview/hooks/memoryFeature";
import { worker } from "./packages/web-worker";
import { TargetOnMessageParams } from "./packages/web-worker/worker";

export const Store = createContext({
  memory: initialMemoryState,
  worker: {
    worker,
    lastEvent: null as MessageEvent<TargetOnMessageParams>["data"] | null,
  },
});

const useWorkerState = () => {
  const [lastEvent, setLastEvent] = useState<MessageEvent<TargetOnMessageParams>["data"] | null>(null);

  useEffect(() => {
    worker.onmessage = (e: MessageEvent<TargetOnMessageParams>) => {
      console.log("worker.onmessage", e.data);
      setLastEvent(e.data);
    };
    worker.postMessage({ command: "load", payload: { type: "built-in" } });
  }, []);

  return {
    worker,
    lastEvent,
  };
};

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const memory = useMemoryFeatureState();
  const worker = useWorkerState();

  return (
    <Store.Provider
      value={{
        memory,
        worker,
      }}
    >
      {children}
    </Store.Provider>
  );
};
