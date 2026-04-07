import type {
  AdapterStepResult,
  InitialMachineState,
  MachineStateSnapshot,
  ProgramLoadContext,
  PvmAdapter,
  PvmStatus,
} from "@pvmdbg/types";
import { bigintToDecStr, decStrToBigint } from "@pvmdbg/types";
import type {
  WorkerOkResponse,
  WorkerRequest,
  WorkerResponse,
} from "./commands.js";
import {
  applyRegisterPatch,
  regsToUint8,
  serializeInitialState,
  uint8ToRegs,
  validateRegisterIndices,
} from "./utils.js";

const DEFAULT_TIMEOUT = 30_000;

/** Error thrown when a worker command times out. */
export class TimeoutError extends Error {
  constructor(command: string, timeoutMs: number) {
    super(`Worker command "${command}" timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

/** Minimal interface for a Worker-like object. */
interface WorkerLike {
  postMessage(data: unknown): void;
  addEventListener(
    type: "message",
    listener: (event: { data: WorkerResponse }) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: { data: WorkerResponse }) => void,
  ): void;
}

/**
 * WorkerBridge implements PvmAdapter on the main thread,
 * delegating calls to a web worker via postMessage.
 */
export class WorkerBridge implements PvmAdapter {
  readonly pvmId: string;
  readonly pvmName: string;
  private messageIdCounter = 0;
  private pendingRequests = new Map<
    string,
    { resolve: (resp: WorkerOkResponse) => void; reject: (err: Error) => void }
  >();
  private messageListener: (event: { data: WorkerResponse }) => void;
  private cachedRegisters: bigint[] | null = null;

  constructor(
    pvmId: string,
    pvmName: string,
    private readonly worker: WorkerLike,
    private readonly defaultTimeout = DEFAULT_TIMEOUT,
  ) {
    this.pvmId = pvmId;
    this.pvmName = pvmName;

    this.messageListener = (event: { data: WorkerResponse }) => {
      const resp = event.data;
      const pending = this.pendingRequests.get(resp.messageId);
      if (!pending) return;
      this.pendingRequests.delete(resp.messageId);
      if (resp.type === "error") {
        pending.reject(new Error(resp.message));
      } else {
        pending.resolve(resp);
      }
    };
    this.worker.addEventListener("message", this.messageListener);
  }

  private nextMessageId(): string {
    return String(++this.messageIdCounter);
  }

  private sendCommand(
    request: WorkerRequest,
    timeoutMs?: number,
  ): Promise<WorkerOkResponse> {
    const timeout = timeoutMs ?? this.defaultTimeout;
    return new Promise<WorkerOkResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(request.messageId);
        reject(new TimeoutError(request.type, timeout));
      }, timeout);

      this.pendingRequests.set(request.messageId, {
        resolve: (resp) => {
          clearTimeout(timer);
          resolve(resp);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

      this.worker.postMessage(request);
    });
  }

  async load(
    program: Uint8Array,
    initialState: InitialMachineState,
    loadContext?: ProgramLoadContext,
  ): Promise<void> {
    const request: WorkerRequest = {
      type: "load",
      messageId: this.nextMessageId(),
      program,
      initialState: serializeInitialState(initialState),
      spiProgram: loadContext?.spiProgram,
      spiArgs: loadContext?.spiArgs,
    };
    await this.sendCommand(request);
    this.cachedRegisters = null;
  }

  async reset(): Promise<void> {
    await this.sendCommand({ type: "reset", messageId: this.nextMessageId() });
    this.cachedRegisters = null;
  }

  async step(n: number, timeoutMs?: number): Promise<AdapterStepResult> {
    const resp = await this.sendCommand(
      { type: "step", messageId: this.nextMessageId(), n },
      timeoutMs,
    );
    const payload = resp.payload;
    if (payload.command !== "step")
      throw new Error("Unexpected response command");
    this.cachedRegisters = null;
    return {
      status: payload.status as PvmStatus,
      pc: payload.pc,
      gas: decStrToBigint(payload.gas),
      exitArg: payload.exitArg,
    };
  }

  async getState(): Promise<MachineStateSnapshot> {
    const resp = await this.sendCommand({
      type: "getState",
      messageId: this.nextMessageId(),
    });
    const payload = resp.payload;
    if (payload.command !== "getState")
      throw new Error("Unexpected response command");
    const registers = payload.registers.map(decStrToBigint);
    this.cachedRegisters = registers;
    return {
      status: payload.status as PvmStatus,
      pc: payload.pc,
      gas: decStrToBigint(payload.gas),
      registers,
    };
  }

  async getMemory(address: number, length: number): Promise<Uint8Array> {
    const resp = await this.sendCommand({
      type: "getMemory",
      messageId: this.nextMessageId(),
      address,
      length,
    });
    const payload = resp.payload;
    if (payload.command !== "getMemory")
      throw new Error("Unexpected response command");
    return payload.data instanceof Uint8Array
      ? payload.data
      : new Uint8Array(payload.data);
  }

  async setRegisters(regs: Map<number, bigint>): Promise<void> {
    validateRegisterIndices(regs);
    // We need to get current registers to apply the patch
    if (!this.cachedRegisters) {
      const state = await this.getState();
      this.cachedRegisters = state.registers;
    }
    const patched = applyRegisterPatch(this.cachedRegisters, regs);
    const data = regsToUint8(patched);
    await this.sendCommand({
      type: "setRegisters",
      messageId: this.nextMessageId(),
      data,
    });
    this.cachedRegisters = patched;
  }

  async setPc(pc: number): Promise<void> {
    await this.sendCommand({
      type: "setPc",
      messageId: this.nextMessageId(),
      pc,
    });
  }

  async setGas(gas: bigint): Promise<void> {
    await this.sendCommand({
      type: "setGas",
      messageId: this.nextMessageId(),
      gas: bigintToDecStr(gas),
    });
  }

  async setMemory(address: number, data: Uint8Array): Promise<void> {
    await this.sendCommand({
      type: "setMemory",
      messageId: this.nextMessageId(),
      address,
      data,
    });
  }

  async shutdown(): Promise<void> {
    await this.sendCommand({
      type: "shutdown",
      messageId: this.nextMessageId(),
    });
    this.worker.removeEventListener("message", this.messageListener);
    this.pendingRequests.clear();
  }
}
