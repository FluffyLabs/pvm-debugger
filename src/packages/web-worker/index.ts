import MyWorker from "./worker?worker&inline";
import WasmWorker from "./wasm-worker?worker&inline";
const worker = new MyWorker();
const wasmWorker = new WasmWorker();

export { worker, wasmWorker };
