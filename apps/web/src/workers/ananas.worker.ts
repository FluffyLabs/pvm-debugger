import {
  AnanasSyncInterpreter,
  initAnanas,
  installWorkerEntry,
} from "@pvmdbg/runtime-worker";

// Queue messages received while the WASM module is still loading.
const pending: MessageEvent[] = [];
self.onmessage = (e: MessageEvent) => {
  pending.push(e);
};

initAnanas().then((api) => {
  const interpreter = new AnanasSyncInterpreter(api);
  const ws = self as unknown as Parameters<typeof installWorkerEntry>[0];
  installWorkerEntry(ws, interpreter);
  // Replay any messages that arrived during init
  for (const msg of pending) {
    ws.onmessage?.(msg);
  }
  pending.length = 0;
});
