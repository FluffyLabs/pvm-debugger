import { Commands, TargerOnMessageParams } from "@/packages/web-worker/worker";
import { useState } from "react";

export const useMemory = () => {
  const [memoryPage, setMemoryPage] = useState<Uint8Array>();

  const handleMemoryPageChange = (ev: Extract<TargerOnMessageParams, { command: Commands.MEMORY_PAGE }>) => {
    setMemoryPage(ev.payload.memoryPage);
  };

  return {
    memoryPage,
    handleMemoryPageChange,
    workerChangePage: (pageNumber: number, worker: Worker) => {
      worker.postMessage({ command: "run", payload: { pageNumber } });
    },
  };
};
